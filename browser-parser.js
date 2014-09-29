(function() {

  'use strict';

	// getElementById
	function $id(id) {
		return document.getElementById(id);
	}

	// output information
  function Output(msg) {
		var m = $id("messages");
		m.innerHTML = msg + m.innerHTML;
	}

	// file drag hover
	function FileDragHover(e) {
		e.stopPropagation();
		e.preventDefault();
		e.target.className = (e.type == "dragover" ? "hover" : "");
	}

	// file selection
	function FileSelectHandler(e) {

		// cancel event and hover styling
		FileDragHover(e);

		// fetch FileList object
		var files = e.target.files || e.dataTransfer.files;

		// process all File objects
		for (var i = 0, f; f = files[i]; i++) {
			ParseFile(f);
		}

	}

	// output file information
	function ParseFile(file) {

		Output(
			"<p>File information: <strong>" + file.name +
			"</strong> type: <strong>" + file.type +
			"</strong> size: <strong>" + file.size +
			"</strong> bytes</p>"
		);
    console.log(file);
		// display a PDF
		if (file.type==='application/pdf') {
            var reader = new FileReader();
            reader.onload = function (e) {
              var buffer = e.target.result;
              var data = new Uint8Array(buffer);

              parsePDFStatement(data, file.name, function(err, transactions) {
                  console.log('done - counted transactions, ',transactions.length);
                  transactions.forEach(function(transaction) {
                    Output(transaction.date+'\t'+transaction.description+'\t'+transaction.amount+'<br>');
                  });
              });
            };
            reader.readAsArrayBuffer(file);
		}

	}


	// initialize
	function Init() {

		var filedrag = $id("filedrag");

		// is XHR2 available?
		var xhr = new XMLHttpRequest();
		if (xhr.upload) {

			// file drop
			filedrag.addEventListener("dragover", FileDragHover, false);
			filedrag.addEventListener("dragleave", FileDragHover, false);
			filedrag.addEventListener("drop", FileSelectHandler, false);
			filedrag.style.display = "block";

		}

	}

	// call initialization file
	if (window.File && window.FileList && window.FileReader) {
		Init();
	}


})();
