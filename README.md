Barclays Bank statement PDF-to-CSV
==================================

*Beyond occasional updates, this project is not actively maintained by @jayfresh any more. Please feel free to take it on if you like it! It looks like Barclays have released bank feeds now, so that's also worth a look: https://help.xero.com/uk/BarclaysFeed*

NB: This only works with Business account statements! Support for personal account statements would need some work.

Reads Barclays Bank statements and extracts transactions. Validates transactions against the total payments and receipts shown in the top-right of the bank statement.

Tested against 18 months' worth of bank statements exported in September 2014.

UPDATE to handle a newer format: The statement format was updated in December 2014. The update code was mainly written April 2015, and incorporated and slightly amended in May 2017.
Therefore the updated app has only been tested on four months of statements (also tested on a statement from 2016).
You should check every statement you convert. There may be some transaction types that have not been encountered, and need to be added, and some possible variants on the layout that are not taken account of.
If you find an entry that is not picked up by the application, please open an issue on Github with the text of the entry description only. Do not share your unedited bank statements with anyone for obvious security reasons.

Built on [Mozilla PDF.JS](http://mozilla.github.io/pdf.js/), which is marvellous.

## Installation

Clone the git repository, then install dependencies:

    git clone https://github.com/penrosestudio/barclays-bank-pdf-to-csv.git
    npm install

## Usage under Node.js

    node statement-parser <folder>

`<folder>` should be a directory containing Barclays Bank statement PDFs.

## Usage in a browser

Open index.html in a browser and drop a PDF onto the drop-zone.

Browsers tested and compatible:
* Mac OS X 10.9.5:
  * Chrome 40.0
  * Safari 7.0.6
  * Firefox 35.0.1
* Windows 7:
  * Firefox 36.0

## Output

A single CSV file will be created called `statements.csv`.

## Issues

Please submit any problems as [GitHub issues](https://github.com/penrosestudio/barclays-bank-pdf-to-csv/issues) on this repository.
