class Weekly {
  constructor(inputFile, startDate) {
    this.startDate = moment(startDate, "MM/DD/YYYY");
    this.departmentNames = {"Baker" : "none", "Dishwasher" : "right", "BOH" : "none", "FOH" : "none", "Busser" : "left", "Cashier" : "left", "Cook" : "right", "Deli" : "left", "Merchandiser" : "none", "Expo" : "left", "Host" : "left", "Manager" : "left", "Kit/Prep" : "right", "Server" : "right"};
    this.exclude = ['Baker', 'FOH', 'BOH', 'Merchandiser'];
    this.sortedGroups = {
      left: [
        "Server",
        "Manager",
        "Host",
        "Expo",
        "Busser",
        "Cashier",
        "Deli",
      ],
      right: ["Dishwasher", "Cook", "Kit/Prep"],
    };
    this.orgData = {};
    this.sheets = [];
    this.pdfContent = [];
    this.workbook = null;
    this.pdfDocument = null;
    this.inputFile = inputFile;
  }

  generatePdfDocumentFromContent() {
    this.pdfDocument = {
      pageOrientation: "landscape",
      pageSize: "LETTER",
      pageMargins: [140, 30, 0, 0],
      content: this.pdfContent,
      styles: {
        dept: {
          fontSize: 14,
          bold: true,
          alignment: "left"
        },
        shift: {
          alignment: "right",
          margin: [8, 0, 0, 0]
        },
        employee: {},
        date: {
          margin: [250, 0, 0, 0],
          bold: true
        }
      }
    };
  }

  buildPdfContent() {
    var departments = Object.keys(this.departmentNames);
    for  (var page=1; page < 8; page++) {
      if (page == 1) {
        this.pdfContent.push({ text: this.startDate.format("ddd, MMM Do"), style: "date" });
      } else {
        this.startDate.add(1, 'days');
        this.pdfContent.push({ text: this.startDate.format("ddd, MMM Do"), pageBreak: "before", style: "date" });
      }

      var leftTable = [];
      var rightTable = [];

      leftTable.push(["", ""]);
      rightTable.push(["", ""]);

      for (var deptIdx = 0; deptIdx < departments.length; deptIdx++) {
        if (this.departmentNames[departments[deptIdx]] == "none") {
          continue;
        }

        switch (this.departmentNames[departments[deptIdx]]) {
                   case 'left':
            leftTable.push([{
              text: departments[deptIdx],
              style: "dept",
              fillColor: "#ffff00",
              colSpan: 2,
            }]);
          break;
          case 'right':
            rightTable.push([{
              text: departments[deptIdx],
              style: "dept",
              fillColor: "#ffff00",
              colSpan: 2,
            }]);
          break;
        }
        var employeeSrcData = this.orgData[page][departments[deptIdx]];
        for (var ee = 0; ee < employeeSrcData.length; ee++) {

        switch (this.departmentNames[departments[deptIdx]]) {
          case 'left':
            leftTable.push([
                  { text: employeeSrcData[ee].employee, style: "employee" },
                { text: employeeSrcData[ee].shift, style: "shift" }]);
          break;
          case 'right':
            rightTable.push([
                  { text: employeeSrcData[ee].employee, style: "employee" },
                { text: employeeSrcData[ee].shift, style: "shift" }]);
          break;
        }
      }
      }
  this.pdfContent.push({
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
  }

  findScheduleStartRow(sheetData) {
      var schedulesStartAtRow = 0;
      for (var row = 0; row < sheetData.length; row++) {
          if (sheetData[row]["Schedule"] === 'POSITION') {
              schedulesStartAtRow = row + 1;
              return schedulesStartAtRow;
          }
      }    
  }

  getEmployeeScheduleLines(sheetData, start) {
    var hasGroupStarted = false;
    var currentGroupName;
    var departments = Object.keys(this.departmentNames);
      for (var row = start; row < sheetData.length; row++) {
          if (hasGroupStarted == false && departments.indexOf(sheetData[row]["Schedule"]) >= 0 ) {
              if (this.exclude.indexOf(sheetData[row]["Schedule"]) < 0) {
                  hasGroupStarted = true;
                  currentGroupName = sheetData[row]["Schedule"];
                  for (var i = 1; i < 8; i++) {
                      if (this.orgData.hasOwnProperty(i) == false) {
                          this.orgData[i] = {};
                          this.orgData[i][sheetData[row]["Schedule"]] = [];
                      } else {
                          if (this.orgData[i].hasOwnProperty(sheetData[row]["Schedule"]) == false) {
                              this.orgData[i][sheetData[row]["Schedule"]] = [];
                          }
                      }
                  }
              }
          } 
          else if (hasGroupStarted == true) {
              var keys = Object.keys(sheetData[row]);
              var employeeName = sheetData[row][keys[0]];
              for (var i =1; i < keys.length; i++) {
                if (sheetData[row][keys[i]] != null && sheetData[row][keys[i]] != "") {
                this.orgData[i][currentGroupName].push( { employee : employeeName, shift: sheetData[row][keys[i]], start: this.convertStartTime(sheetData[row][keys[i]]) } );
                }
              }
          }
          else {
              hasGroupStarted = false;
              currentGroupName = "";
          }
      }
  }

  convertStartTime(shiftString) {
      var extract = shiftString.match(/^(.*)\s-/)[1];
      var hours = Number(extract.match(/^(\d+)/)[1]);
      var minutes = Number(extract.match(/:(\d+)/)[1]);
      var AMPM = extract.match(/.*(A|P)$/)[1];
      if(AMPM == "P" && hours<12) hours = hours+12;
      if(AMPM == "A" && hours==12) hours = hours-12;
      var sHours = hours.toString();
      var sMinutes = minutes.toString();
      if(hours<10) sHours = "0" + sHours;
      if(minutes<10) sMinutes = "0" + sMinutes;
      var fString = sHours + ":" + sMinutes;
      return fString;
  }

  async openFileAsync() {
    const file = this.inputFile;
    const data = await file.arrayBuffer();
    this.workbook = XLSX.read(data);
  }

  async getSheetNames() { 
    this.sheets = this.workbook.SheetNames;
  }

  async getFormattedDataFromSheets() {
      for (var sheetCount = 0; sheetCount < this.sheets.length; sheetCount++) {
        var sheetData = XLSX.utils.sheet_to_json(this.workbook.Sheets[this.workbook.SheetNames[sheetCount]], {defval:""});
        var schedulesStartAtRow = this.findScheduleStartRow(sheetData);
        this.getEmployeeScheduleLines(sheetData, schedulesStartAtRow);
      }
  }

  async sortOrgDataByEmployeeShift() {
      var days = Object.keys(this.orgData);
      for (var day = 0; day < days.length; day++) {
          var depts = Object.keys(this.orgData[days[day]]);
          for (var dept = 0; dept < depts.length; dept++) {
              await this.orgData[days[day]][depts[dept]].sort((a, b) => {
                  let fa = a.start,
                      fb = b.start;

                  if (fa < fb) {
                      return -1;
                  }
                  if (fa > fb) {
                      return 1;
                  }
                  return 0;
              });
          }
      }
  }

  async run() {
      await this.openFileAsync();
      await this.getSheetNames();
      await this.getFormattedDataFromSheets();
      await this.sortOrgDataByEmployeeShift();
      this.buildPdfContent();
      this.generatePdfDocumentFromContent();
      pdfMake.createPdf(this.pdfDocument).download(Date.now() + ".pdf");
  }

}

