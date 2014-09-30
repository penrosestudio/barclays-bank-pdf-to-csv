Barclays Bank statement PDF-to-CSV
==================================

NB: This only works with Business account statements! Support for personal account statements is planned, pending getting hold of an appropriate PDF.

Reads Barclays Bank statements and extracts transactions. Validates transactions against the total payments and receipts shown in the top-right of the bank statement.

Tested against 18 months' worth of bank statements exported in September 2014.

Built on [Mozilla PDF.JS](http://mozilla.github.io/pdf.js/), which is marvellous.

In-browser version online at: http://penrosestudio.com/barclays-bank-pdf-to-csv/

## Installation

Clone the git repository, then install dependencies:

    git clone https://github.com/penrosestudio/barclays-bank-pdf-to-csv.git
    npm install

## Usage under Node.js

    node statement-parser <folder>

`<folder>` should be a directory containing Barclays Bank statement PDFs.

## Usage in a browser

Open index.html in a browser and drop a PDF onto the drop-zone.

## Output

A single CSV file will be created called `statements.csv`.

## Issues

Please submit any problems as [GitHub issues](https://github.com/penrosestudio/barclays-bank-pdf-to-csv/issues) on this repository.
