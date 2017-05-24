var fs = require('fs');
var async = require('async');
var path = require('path');
var parsePDFStatement = require('./statement-parser-lib');
var pdfFolder = process.argv[2];

if (!pdfFolder) {
  throw new Error('statement-parser requires a path to a folder of PDF statement');
}

fs.readdir(pdfFolder, function(err, files) {
  var pdfs = files.filter(function(fileName) {
    // check file extension is 'pdf'
    return fileName.substring(fileName.length - 4) === '.pdf';
  }).map(function(fileName) {
    // put the correct path in so parsePDFStatement can find it
    return path.join(pdfFolder,fileName);
  });
  if (!pdfs.length) {
    throw new Error('no PDFs in that folder!');
  }
  async.mapSeries(pdfs, parsePDFStatement, function(err, results) {
    // flatten the array of arrays
    var flattenedResults = [];
    flattenedResults = Array.prototype.concat.apply(flattenedResults,results);
    console.log('all done');
    var csvResults = csvify(flattenedResults);
    //console.log(csvResults);
    var outputFileName = 'statements.csv';
    fs.writeFile(outputFileName, csvResults, function(err) {
      if (err) {
        throw err;
      }
      console.log('output written to ' + outputFileName);
    });
  });
});

function csvify(transactions) {
  var csvPieces = [];
  transactions.forEach(function(transaction) {
    csvPieces.push(transaction.date + '\t' + transaction.description +
      '\t' + transaction.amount);
  });
  return csvPieces.join('\n');
}
