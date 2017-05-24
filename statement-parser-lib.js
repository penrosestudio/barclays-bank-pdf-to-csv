// Requires single file built version of PDF.js -- please run
// `node make singlefile` before running the example.
//

// TO-DO: doesn't get the year right when the statement covers two years e.g. the statement is dated January 2014 but contains transactions from December 2013

(function() {

  var isBrowser = typeof window!=='undefined';

  // if not in a browser
  // few hacks to let PDF.js be loaded not as a module in global space
  if(!isBrowser) {
    var fs = require('fs');

    global.window = global;
    global.navigator = { userAgent: "node" };
    global.PDFJS = {};
    require('./domstubs.js');
    PDFJS.workerSrc = true;
    require('./pdf.combined.js');

    var debugMode = process.argv[3] === '--debug';
    if(!debugMode) {
      console.info = function() {
        // do nothing
      };
    }
  }

  // NB: we'd have to move these inside function scope if we wanted this file to provide a method that could be run multiple times in parallel
  var totalPaymentsFromStatement,
      totalPaymentsFromTransactions,
      totalReceiptsFromStatement,
      totalReceiptsFromTransactions,
      transactions,
      currentTransactionDate,
      statementYear;

  /*
   * Parse a PDF data stream for statement data
   * Safe to use in a browser
   */
  function parsePDFStatement(data, fileName, callback) {

    // reset global variable each time
    totalPaymentsFromStatement = 0;
    totalPaymentsFromTransactions = 0;
    totalReceiptsFromStatement = 0;
    totalReceiptsFromTransactions = 0;
    transactions = [];
    currentTransactionDate = '';

    // get the statement year from the filename
    var statementFileNameDelimiter = 'Statement_'; // e.g. Statement_20140807.pdf
    statementYear = fileName.substr(fileName.lastIndexOf(statementFileNameDelimiter)+statementFileNameDelimiter.length,4);

    // Will be using promises to load document, pages and misc data instead of
    // callback.
    PDFJS.getDocument(data).then(function (doc) {

      // load preview of the PDF in the canvas if present
      if(isBrowser) {
        doc.getPage(1).then(function(page) {
          var scale = 1.5;
          var viewport = page.getViewport(scale);

          // Prepare canvas using PDF page dimensions
          var canvas = document.getElementById('the-canvas');
          var context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Render PDF page into canvas context
          var renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          page.render(renderContext);
        });
      }

      var numPages = doc.numPages;
      console.info('# Document Loaded');
      console.info('Number of Pages: ' + numPages);
      console.info();

      var lastPromise; // will be used to chain promises
      lastPromise = doc.getMetadata().then(function (data) {
        console.info('# Metadata Is Loaded');
        console.info('## Info');
        console.info(JSON.stringify(data.info, null, 2));
        console.info();
        if (data.metadata) {
          console.info('## Metadata');
          console.info(JSON.stringify(data.metadata.metadata, null, 2));
          console.info();
        }
      });

      var loadPage = function (pageNum) {
        return doc.getPage(pageNum).then(function (page) {
          console.info('# Page ' + pageNum);
          var viewport = page.getViewport(1.0 /* scale */);
          console.info('Size: ' + viewport.width + 'x' + viewport.height);
          console.info();
          return page.getTextContent().then(function (content) {
            // Content contains lots of information about the text layout and
            // styles, but we need only strings at the moment
            var strings = content.items.map(function (item, i) {
              //console.info(JSON.stringify(item));
              // add an appropriate whitespace character here if the next item is on the same line and more than 5px to the right, or is on the next line
              // item.transform[4] is the x coordinate
              // item.transform[5] is the y coordinate
              var nextItem = content.items[i+1],
                  padding = '',
                  isFarAway,
                  isOnSameLine;
              if(nextItem) {
                isOnSameLine = nextItem.transform[5] === item.transform[5]; // transform[5] is y coordinate
                isFarAway = nextItem.transform[4] - (item.transform[4] + item.width) > 5; // transform[4] is x coordinate
                //console.info('distance to next item', nextItem.transform[4] - item.transform[4],item.str,nextItem.str);
                if(!isOnSameLine) {
                  padding = '\\n';
                }
                if(isFarAway) {
                  padding = '\t';
                }
              }
              return item.str+padding;
            });
            console.log('## Text Content');
            var text = strings.join('');
            console.log(text);
            processStatement(text, pageNum);
            console.info('# Transactions analysed');
          }).then(function () {
            console.info();
          });
        });
      };
      // Loading of the first page will wait on metadata and subsequent loadings
      // will wait on the previous pages.
      for (var i = 1; i <= numPages; i++) {
        lastPromise = lastPromise.then(loadPage.bind(null, i));
      }
      return lastPromise;
    }).then(function () {
      console.info('# End of Document');
      var transactionsList = transactions.map(function(transaction) { return transaction.date+'\t'+transaction.description+'\t'+transaction.amount; }).join('\n');
      console.info(transactionsList);
      console.log('Totals from statement: payments '+totalPaymentsFromStatement+', receipts '+totalReceiptsFromStatement);
      console.log('Totals from transactions: payments '+totalPaymentsFromTransactions.toFixed(2)+', receipts '+totalReceiptsFromTransactions.toFixed(2));
      var errorsInPayments = (totalPaymentsFromTransactions-totalPaymentsFromStatement).toFixed(2),
        errorsInReceipts = (totalReceiptsFromTransactions-totalReceiptsFromStatement).toFixed(2);
      console.warn('Errors: payments '+errorsInPayments+', receipts '+errorsInReceipts);
      callback(null, transactions);
    }, function (err) {
      console.error('Error: ' + err);
      callback(err);
    });

  } // end of processPDFStatment()

  var payments = [
    "Debit card payment to",
    "Direct debit to",
    "Card Payment",
    "Credit Payment",
    "Internet Banking transfer to",
    "On-line Banking bill payment to",
    "Commission charges",
    "Standing order to",
    "Cash machine withdrawal",
    "Cheque issued"
  ];
  var receipts = [
    "Direct credit from",
    "Debit card refund from",
    "Internet Banking transfer from",
    "Deposit", // NB: not sure this is a generic reference
    "Refund from",
    "Business Banking Loyalty Reward"
  ];

  var transactionsStart = [
                            'Transactions in date order\\nDate\tDescription\tPayments\tReceipts\tBalance',//Old statement format
                            'Your Business Current Account',
                            'Continued\\n'
                          ];
  /*
  transaction ending patterns are:
  * Interim balance carried forward3,856.88 - used on first page when a day's transaction spill over to the second page
  * 3,056.16 - used on first page when used on first page when a day's transactions finished neatly at the end of the page
  * Continued   6 FebInterim balance brought forward4,515.18Interim balance carried forward4,421.10 - used on intermediate pages
  * 4,016.1017 FebBalance carried forward - used on last page
  */
  var paymentsMarkers = payments.join('|');
  var receiptsMarkers = receipts.join('|');
  var optionalDateMarker = '(?:(\\d{1,2} [a-zA-z]{3})\t)?'; // some transactions are preceded by dates such as '7 Feb' or '21 Jul'
  var amountMarker = '\t[\\d,]+\\.\\d\\d';
  var trailingBalanceMarker = '(?:[\\d,]+\\.\\d\\d)?'; // some transactions are followed by balances that can interfere a subsequent date e.g. 'Direct credit from G Kirschner Ref:-KirschnerBooking306.004,109.18' followed by '7 FebDebit card payment...'
  var transactionSeparator = new RegExp(optionalDateMarker+'(('+paymentsMarkers+'|'+receiptsMarkers+').+?)('+amountMarker+')'+trailingBalanceMarker,'gi');
  var totalsMarker = new RegExp('Total payments - incl\\.\\\\ncommission & interest('+amountMarker+').+?Total receipts('+amountMarker+')');
  //console.info('transaction separator',transactionSeparator);

  function processStatement(text, pageNum) {

    // get totals if this is page 1
    if(pageNum===1) {
      var totals = text.match(totalsMarker);
      if(totals) {
        // convert strings such as '10,271.17' to 10271.17
        totalPaymentsFromStatement = -parseFloat(totals[1].replace(',','')).toFixed(2);
        totalReceiptsFromStatement = parseFloat(totals[2].replace(',','')).toFixed(2);
      }
    }
    // extract statement lines
    var startIndex,
        loopStartIndex,
        //endIndex = text.search(transactionsEnd),
        matches;
    for (var i = transactionsStart.length - 1; i >= 0; i--) {
      loopStartIndex = text.indexOf(transactionsStart[i]);

      if(loopStartIndex > -1){
        startIndex = loopStartIndex;
      }
    };
    if(typeof startIndex === 'undefined'){
      startIndex = -1;
    }

    //if(endIndex===-1 || startIndex===-1) {
    if(startIndex===-1) {
      console.warn('could not find start of transactions in text, skipping page '+pageNum);
      console.info(text);
      return;
    }
    //newText = text.substring(startIndex+transactionsStart.length, endIndex);
    text = text.substring(startIndex+transactionsStart.length);

    // extract transactions
    //console.info('**** check for argument we want ****');
    matches = transactionSeparator.exec(text);
    do {
      if(!matches) {
        throw new Error('no initial matches for '+text);
      }
      //console.info(matches);
      var transactionDate = matches[1],
          paymentOrReceiptIndicator = matches[3],
          transactionAmount = parseFloat(matches[4].replace(',','')).toFixed(2),
          transactionDirection = -1; // start by assuming outgoing transaction
      // adjust sign of amount according to whether it is an incoming or outgoing transaction
      if(receipts.indexOf(paymentOrReceiptIndicator)!==-1) {
        transactionDirection = 1; // it is an incoming transaction
      }
      transactionAmount = transactionAmount*transactionDirection;
      // if transaction has a date, add the statement year and update the currently set transaction date
      // if the transaction has no date, use currently set transaction date
      if(transactionDate) {
        //console.info('transaction date is set to',transactionDate);
        transactionDate += ' '+statementYear;
        currentTransactionDate = transactionDate;
      } else {
        transactionDate = currentTransactionDate;
      }

      // update the transaction description to replace any escaped '\n' characters that were put there as padding
      var transactionDescription = matches[2].replace(/\\n/g,' ');

      transactions.push({
        date: transactionDate,
        description: transactionDescription,
        amount: transactionAmount
      });

      if(transactionDirection>0) { // i.e. is an incoming transaction
        totalReceiptsFromTransactions += transactionAmount;
      } else {
        totalPaymentsFromTransactions += transactionAmount;
      }
      matches = transactionSeparator.exec(text);
    } while(matches);
    //console.info('**** end of matches ****');
  }

  /*
   * Parse a PDF statement given its file path
   * Only works under node
   */
  function parsePDFPath(pdfPath, callback) {
    if(!pdfPath) {
      throw new Error('parsePDFStatement requires a pdfPath argument');
    }

    console.log('# Starting '+pdfPath);

    // Loading file from file system into typed array
    var data = new Uint8Array(fs.readFileSync(pdfPath));

    parsePDFStatement(data, pdfPath, callback);
  }

  // export the useful node method if we're in node
  // otherwise set up a window method
  if(!isBrowser) {
    module.exports = parsePDFPath;
  } else {
    window.parsePDFStatement = parsePDFStatement;
  }

}());
