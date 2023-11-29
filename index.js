const input = document.getElementById("input");

var pdfContent = [];

// data schema, so to speak
const schemaScheduleDateCol = 0;
const schemaScheduleDateRow = 4;
const skip1 = 3;
const skip2 = 2;
// end of data schema

input.addEventListener("change", () => {
  processFiles();
});

function addToPdf(content) {
  pdfContent.push(content);
}

function getPdfContent() {
  return pdfContent;
}

function definePdfDocument(content) {
  var pdfDocument = {
    pageOrientation: "landscape",
    pageSize: "LETTER",
    pageMargins: [140, 30, 0, 0],
    content: content,
    styles: {
      dept: {
        fontSize: 14,
        bold: true,
        alignment: "left",
      },
      shift: {
        alignment: "right",
        margin: [8, 0, 0, 0],
      },
      employee: {},
      date: {
        margin: [250, 0, 0, 0],
        bold: true,
      },
    },
  };
  return pdfDocument;
}

function generateSinglePage(data, pageDate, first) {
  var leftTable = [];
  var rightTable = [];

  leftTable.push(["", ""]);
  rightTable.push(["", ""]);
  for (var i = 0; i < data.left.length; i++) {
    leftTable.push([
      {
        text: data.left[i].dept,
        style: "dept",
        fillColor: "#ffff00",
        colSpan: 2,
      },
    ]);
    for (var j = 0; j < data.left[i].ee.length; j++) {
      leftTable.push([
        { text: data.left[i].ee[j].name, style: "employee" },
        { text: data.left[i].ee[j].shift, style: "shift" },
      ]);
    }
  }

  for (var ii = 0; ii < data.right.length; ii++) {
    rightTable.push([
      {
        text: data.right[ii].dept,
        style: "dept",
        fillColor: "#ffff00",
        colSpan: 2,
      },
    ]);
    for (var jj = 0; jj < data.right[ii].ee.length; jj++) {
      rightTable.push([
        { text: data.right[ii].ee[jj].name, style: "employee" },
        { text: data.right[ii].ee[jj].shift, style: "shift" },
      ]);
    }
  }

  if (first == true) {
    addToPdf({ text: pageDate, style: "date" });
  } else {
    addToPdf({ text: pageDate, pageBreak: "before", style: "date" });
  }

  addToPdf({
    columns: [
      {
        width: "auto",
        table: {
          headerRows: 0,
          body: leftTable,
        },
        layout: "noBorders",
      },
      {
        width: "auto",

        table: {
          headerRows: 0,
          body: rightTable,
        },
        layout: "noBorders",
      },
    ],
    columnGap: 108,
  });
}

function extractData(rows) {
  const scheduleDate = rows[schemaScheduleDateRow][schemaScheduleDateCol];

  var hasGroupStarted = false;
  var startGroupAdd = false;
  var currentGroupKey = null;

  var skip1Count = 0;
  var skip2Count = 0;

  const sortedGroups = {
    left: [
      "Server",
      "Managers",
      "Hostess",
      "Expo's",
      "Bussers",
      "Cashiers",
      "Deli",
    ],
    right: ["Dishwashers", "Cooks", "Preps"],
  };

  var groups = {};
  var newSort = { left: [], right: [] };

  for (var row = 0; row < rows.length; row++) {
    // get group name
    if (
      rows[row][0] == "Schedule" &&
      hasGroupStarted == false &&
      rows[row][1] != "FOH" &&
      rows[row][1] != "BOH" &&
      rows[row][1] != "Bakers"
    ) {
      hasGroupStarted = true;
      groups[rows[row][1]] = { dept: rows[row][1], ee: [] };
      currentGroupKey = rows[row][1];
    }
    //
    else if (hasGroupStarted == true) {
      if (startGroupAdd == false && skip1Count < skip1) {
        skip1Count++;
        if (skip1 == skip1Count) {
          startGroupAdd = true;
        }
      } else if (startGroupAdd == true && rows[row][0] != null) {
        groups[currentGroupKey].ee.push({
          name: rows[row][0],
          shift: rows[row][2],
        });
      } else if (startGroupAdd == true && rows[row][0] == null) {
        startGroupAdd = false;
        skip2Count++;
      } else if (startGroupAdd == false && skip2Count < skip2) {
        skip2Count++;
        if (skip2Count == skip2) {
          skip1Count = 0;
          skip2Count = 0;
          hasGroupStarted = false;
          startGroupAdd = false;
          currentGroupKey = null;
        }
      }
    }
  }

  for (var leftGroup = 0; leftGroup < sortedGroups.left.length; leftGroup++) {
    var key = sortedGroups.left[leftGroup];
    if (key in groups) {
      newSort.left.push(groups[key]);
    }
  }
  for (
    var rightGroup = 0;
    rightGroup < sortedGroups.right.length;
    rightGroup++
  ) {
    var key = sortedGroups.right[rightGroup];
    if (key in groups) {
      newSort.right.push(groups[key]);
    }
  }

  return { pageData: newSort, pageDate: scheduleDate };
}

const readFile = (fInput) =>
  readXlsxFile(fInput)
    .then((rows) => rows)
    .then((data) => {
      return data;
    });

const processFiles = async () => {
  for (var file = 0; file < input.files.length; file++) {
    const fileRows = await readFile(input.files[file]);
    const formattedData = extractData(fileRows);
    var isFirstPage = (file == 0) ? true : false;
    generateSinglePage(
      formattedData.pageData,
      formattedData.pageDate,
      isFirstPage
    );
  }
  const content = getPdfContent();
  const pdfDocument = definePdfDocument(content);
  pdfMake.createPdf(pdfDocument).download(Date.now() + ".pdf");
};
