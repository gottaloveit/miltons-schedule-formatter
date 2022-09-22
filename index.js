const input = document.getElementById("input");

input.addEventListener("change", () => {
  for (var num=0; num< input.files.length; num++) {
  readXlsxFile(input.files[num])
    .then((rows) => {
      var data = manipulateRows(rows);
      return data;
    })
    .then((data) => {
      var content = generateSinglePage(data.pageData, data.pageDate, true);
      return content;
    })
    .then((content) => {
      var docDefinition = {
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
      pdfMake.createPdf(docDefinition).download("file.pdf");
    });
  }
});

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

  var ob;

  if (first == true) {
    ob = { text: pageDate, style: "date" };
  } else {
    ob = { text: pageDate, pageBreak: "before", style: "date" };
  }

  var content = [
    ob,
    {
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
    },
  ];
  return content;
}

function manipulateRows(rows) {
  const scheduleDate = rows[4][0];

  var hasGroupStarted = false;
  var faveDate = false;
  var startGroupAdd = false;
  var currentGroupKey = null;

  const skip1 = 3;
  const skip2 = 2;
  var skip1Count = 0;
  var skip2Count = 0;

  var sortedGroups = {
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

  for (var c = 0; c < rows.length; c++) {
    if (
      rows[c][0] == "Schedule" &&
      hasGroupStarted == false &&
      rows[c][1] != "FOH" &&
      rows[c][1] != "BOH" &&
      rows[c][1] != "Bakers"
    ) {
      hasGroupStarted = true;
      groups[rows[c][1]] = { dept: rows[c][1], ee: [] };
      currentGroupKey = rows[c][1];
    } else if (hasGroupStarted == true) {
      if (startGroupAdd == false && skip1Count < skip1) {
        skip1Count++;
        if (skip1 == skip1Count) {
          startGroupAdd = true;
        }
      } else if (startGroupAdd == true && rows[c][0] != null) {
        groups[currentGroupKey].ee.push({
          name: rows[c][0],
          shift: rows[c][1],
        });
      } else if (startGroupAdd == true && rows[c][0] == null) {
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

  var keys = Object.keys(groups);

  for (var bb = 0; bb < sortedGroups.left.length; bb++) {
    key = sortedGroups.left[bb];
    if (key in groups) {
      newSort.left.push(groups[key]);
    }
  }
  for (var bc = 0; bc < sortedGroups.right.length; bc++) {
    key = sortedGroups.right[bc];
    if (key in groups) {
      newSort.right.push(groups[key]);
    }
  }

  return { pageData: newSort, pageDate: scheduleDate };
}
