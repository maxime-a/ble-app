/*
Example from :
https://googlechrome.github.io/samples/web-bluetooth/discover-services-and-characteristics.html?optionalServices=0x0100%2C0x0300
*/
var myDevice;
var myService = 0x0100;        
var myService2 = 0x0300;
var myService3 = 0x0200;
var myCharacteristic = 0x0103;   
var myCharacteristic2 = 0x0301;
var myCharacteristic3 = 0x0204;

var characteristicStatus;
var characteristicActuators;
var characteristicCalendar;

var tempTable;

google.charts.load('current',{packages:['corechart']}).then(function(){
  tempTable = new google.visualization.DataTable();
  tempTable.addColumn('datetime', 'Time of Day');
  tempTable.addColumn('number', 'Temperature');});
//google.charts.setOnLoadCallback(drawChart);

function drawChart() {
  // Set Options
  var options = {
    title: 'Temperature',
    hAxis: {title: 'Time'},
    vAxis: {
      title: 'Temperature in degrees celsius',
      viewWindow:{
        max:35,
        min:10
      }
    },
    legend: 'none'
  };
  // Draw
  var chart = new google.visualization.LineChart(document.getElementById('myChart'));
  chart.draw(tempTable, options);
}

async function connect() {
  // Validate services UUID entered by user first.
  let servicesNeeded = [myService,myService2,myService3];

  try {
    console.log('Requesting any Bluetooth Device...');
    myDevice = await navigator.bluetooth.requestDevice({
     // filters: [...] <- Prefer filters to save energy & show relevant devices.
        acceptAllDevices: true,
        services: servicesNeeded,
        optionalServices : servicesNeeded});
    myDevice.addEventListener('gattserverdisconnected', disconnect);
    console.log('Connecting to GATT Server...');
    const server = await myDevice.gatt.connect();

    // Note that we could also get all services that match a specific UUID by
    // passing it to getPrimaryServices().
    console.log('Getting Services...');
    const services = await server.getPrimaryServices();

    console.log('Getting Characteristics...');
    for (const service of services) {
      console.log('> Service: ' + service.uuid);
      const characteristics = await service.getCharacteristics();

      characteristics.forEach(characteristic => {
        console.log('>> Characteristic: ' + characteristic.uuid + ' ' +
            getSupportedProperties(characteristic));
        if(characteristic.uuid === "00000101-0000-1000-8000-00805f9b34fb")
        {
          characteristicStatus=characteristic;
        }
        if(characteristic.uuid === "00000102-0000-1000-8000-00805f9b34fb")
        {
          characteristicActuators=characteristic;
        }
        if(characteristic.uuid === "00000103-0000-1000-8000-00805f9b34fb")
        {
          characteristic.startNotifications();
          subscribeToChangesActuators(characteristic);
        }
        if(characteristic.uuid === "00000204-0000-1000-8000-00805f9b34fb")
        {
          characteristicCalendar=characteristic;
        }
        if(characteristic.uuid === "00000301-0000-1000-8000-00805f9b34fb")
        {
          characteristic.startNotifications();
          subscribeToChangesMeasurements(characteristic);
        }
      });
    }
    pageInit();

  } catch(error) {
    console.log('Argh! ' + error);
  }
}

/* Utils */

function getSupportedProperties(characteristic) {
  let supportedProperties = [];
  for (const p in characteristic.properties) {
    if (characteristic.properties[p] === true) {
      supportedProperties.push(p.toUpperCase());
    }
  }
  return '[' + supportedProperties.join(', ') + ']';
}

// Called at the end of connection to read the characteristics and update the switches states accordingly
async function pageInit() {
  let statusWord = new Uint8Array(2);
  
  statusWord = await readStatus();
  console.log('Read');
  console.log(statusWord);

  if(statusWord[1]&0b00000010)
  {
    document.getElementById('modeSwitch').checked = true;
  }
  else
  {
    document.getElementById('modeSwitch').checked = false;
  }

  let actuatorsWord = new Uint8Array(2);
  
  actuatorsWord = await readActuators();
  console.log('Read');
  console.log(actuatorsWord);

  if(actuatorsWord[1]&0b00000001)
  {
    document.getElementById('fanSwitch').checked = true;
  }
  else
  {
    document.getElementById('fanSwitch').checked = false;
  }
  if(actuatorsWord[1]&0b00000010)
  {
    document.getElementById('co2Switch').checked = true;
  }
  else
  {
    document.getElementById('co2Switch').checked = false;
  }
  if(actuatorsWord[1]&0b00000100)
  {
    document.getElementById('lightSwitch').checked = true;
  }
  else
  {
    document.getElementById('lightSwitch').checked = false;
  }
}

// subscribe to changes from the meter:
function subscribeToChangesActuators(characteristic) {
  characteristic.oncharacteristicvaluechanged = handleDataActuators;
}

function subscribeToChangesMeasurements(characteristic) {
  characteristic.oncharacteristicvaluechanged = handleDataMeasurements;
}

// handle incoming data:
function handleDataActuators(event) {
  // get the data buffer from the meter:
  var buf = new Uint8Array(event.target.value.buffer);
  if(buf[1]&0b00000001)
  {
    document.getElementById('fanSwitch').checked = true;
  }
  else
  {
    document.getElementById('fanSwitch').checked = false;
  }
  if(buf[1]&0b00000010)
  {
    document.getElementById('co2Switch').checked = true;
  }
  else
  {
    document.getElementById('co2Switch').checked = false;
  }
  if(buf[1]&0b00000100)
  {
    document.getElementById('lightSwitch').checked = true;
  }
  else
  {
    document.getElementById('lightSwitch').checked = false;
  }
  document.getElementById('actuatorsNotify').innerHTML = "0x"+buf.toString();
}

function handleDataMeasurements(event) {
  // get the data buffer from the meter:
  var buf = new Uint8Array(event.target.value.buffer);
  document.getElementById('measurementsNotify').innerHTML = "0x"+buf.toString();
  tempTable.addRow([new Date(), ((buf[17]*255+buf[18])/10)]);
  drawChart();
}

// read buttons handlers
async function readStatus(){
  var value = await characteristicStatus.readValue();
  let statusWord = new Uint8Array(value.buffer);
  console.log(statusWord);
  console.log(statusWord[0]);
  console.log(statusWord[1]);
  document.getElementById('status').innerHTML = "0x"+statusWord.toString();
  return statusWord;
}

async function readActuators(){
  var value = await characteristicActuators.readValue();
  let statusWord = new Uint8Array(value.buffer);
  console.log(statusWord);
  console.log(statusWord[0]);
  console.log(statusWord[1]);
  document.getElementById('actuators').innerHTML = "0x"+statusWord.toString();
  return statusWord;
}

// switchs handlers
async function modeChange(){

  
  let statusWord = new Uint8Array(2);
  
  statusWord = await readActuators();
  console.log('Read');
  console.log(statusWord);

  if(document.getElementById("modeSwitch").checked)
  {
    statusWord[1]=0x02 | statusWord[1];
  }
  else
  {
    statusWord[1]=0b11111101 & statusWord[1];
  }
  
  console.log('Resultat');
  console.log(statusWord);
  try{
    await characteristicStatus.writeValue(statusWord);
  }
  catch(error){
    console.log('Argh! ' + error);
  }


}

async function fanChange(){

  
  let statusWord = new Uint8Array(2);
  
  statusWord = await readActuators();
  console.log('Read');
  console.log(statusWord);

  if(document.getElementById("fanSwitch").checked)
  {
    statusWord[1]=0x01 | statusWord[1];
  }
  else
  {
    statusWord[1]=0b11111110 & statusWord[1];
  }
  
  console.log('Resultat');
  console.log(statusWord);
  try{
    await characteristicActuators.writeValue(statusWord);
  }
  catch(error){
    console.log('Argh! ' + error);
  }

}

async function co2Change(){

  
  let statusWord = new Uint8Array(2);
  
  statusWord = await readActuators();
  console.log('Read');
  console.log(statusWord);

  if(document.getElementById("co2Switch").checked)
  {
    statusWord[1]=0x02 | statusWord[1];
  }
  else
  {
    statusWord[1]=0b11111101 & statusWord[1];
  }
  
  console.log('Resultat');
  console.log(statusWord);
  try{
    await characteristicActuators.writeValue(statusWord);
  }
  catch(error){
    console.log('Argh! ' + error);
  }

}

async function lightChange(){

  
  let statusWord = new Uint8Array(2);
  
  statusWord = await readActuators();
  console.log('Read');
  console.log(statusWord);

  if(document.getElementById("lightSwitch").checked)
  {
    statusWord[1]=0x04 | statusWord[1];
  }
  else
  {
    statusWord[1]=0b11111011 & statusWord[1];
  }
  
  console.log('Resultat');
  console.log(statusWord);
  try{
    await characteristicActuators.writeValue(statusWord);
  }
  catch(error){
    console.log('Argh! ' + error);
  }

}

// disconnect function:
function disconnect() {
  if (myDevice) {
    // disconnect:
    myDevice.gatt.disconnect();
    document.getElementById('measurementsNotify').innerHTML = "0x????";
    document.getElementById('measurementsNotify').innerHTML = "0x????????????????????????????????????";
  }
}

async function setTime() {
  const d = new Date();
  let calendarWord = new Uint8Array(35);
  calendarWord[11]=parseInt(d.getHours().toString(),16); //parseInt to convert d.getHours to bcd
  calendarWord[12]=parseInt(d.getMinutes().toString(),16);
  calendarWord[13]=parseInt(d.getSeconds().toString(),16);
  console.log(d);

  console.log('Resultat');
  console.log(calendarWord);
  try{
    await characteristicCalendar.writeValue(calendarWord);
  }
  catch(error){
    console.log('Argh! ' + error);
  }
}