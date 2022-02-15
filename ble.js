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
var characteristicPosition;
var characteristicSensors;

var tempTable;

google.charts.load('current',{packages:['corechart']}).then(function(){
  tempTable = new google.visualization.DataTable();
  tempTable.addColumn('datetime', 'Time of Day');
  tempTable.addColumn('number', 'Temperature');
  tempTable.addColumn('number', 'Humidity');});
//google.charts.setOnLoadCallback(drawChart);

function drawChart() {
  // Set Options
  var options = {
    title: 'Temperature & Humidity',
    hAxis: {title: 'Time'},
    vAxis: {
      title: 'Temperature in degrees celsius and humidity in %',
      viewWindow:{
        max:100,
        min:10
      }
    },
    curveType: 'function',
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
        name : 'EcoTrap',
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
        if(characteristic.uuid === "00000202-0000-1000-8000-00805f9b34fb")
        {
          characteristicSensors=characteristic;
        }
        if(characteristic.uuid === "00000204-0000-1000-8000-00805f9b34fb")
        {
          characteristicCalendar=characteristic;
        }
        if(characteristic.uuid === "00000205-0000-1000-8000-00805f9b34fb")
        {
          characteristicPosition=characteristic;
        }
        if(characteristic.uuid === "00000301-0000-1000-8000-00805f9b34fb")
        {
          characteristic.startNotifications();
          subscribeToChangesMeasurements(characteristic);
        }
      });
    }
    
    setTimeout(pageInit, 500); //Don't call immediatly that cause unknown GATT error on mobile

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

function onPageLoad()
{
  HTMLinit();
}

function HTMLinit()
{
  document.getElementById("setAlarm1").checked=false;
  document.getElementById("setAlarm2").checked=false;
  
  // This will disable all the children of the div
  var nodes = document.getElementById("alarm1div").getElementsByTagName('*');
  for(var i = 0; i < nodes.length; i++){
      nodes[i].disabled = true;
  }

  // This will disable all the children of the div
  var nodes = document.getElementById("alarm2div").getElementsByTagName('*');
  for(var i = 0; i < nodes.length; i++){
      nodes[i].disabled = true;
  }
}

// Called at the end of connection to read the characteristics and update the switches states accordingly
async function pageInit() {

  HTMLinit();

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

  let positionWord = new Uint8Array(8);
  positionWord = await readPosition();

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
  tempTable.addRow([new Date(), ((buf[17]*255+buf[18])/10),buf[13]]); //buff[19] for the humidity normally
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

async function readPosition(){
  var value = await characteristicPosition.readValue();
  const statusWord = new Uint8Array(value.buffer);
  console.log(statusWord);
  console.log(statusWord[0]);
  console.log(statusWord[1]);

  // Create a buffer
  var buf = new ArrayBuffer(8);
  // Create a data view of it
  var view = new DataView(buf);

  // set bytes
  statusWord.forEach(function (b, i) {
      view.setUint8(i, b);
  });

  // Read the bits as a float; note that by doing this, we're implicitly
  // converting it from a 32-bit float into JavaScript's native 64-bit double
  var latitude = view.getFloat32(0,true); //true little endian
  var longitude = view.getFloat32(4,true);
  // Done
  console.log(latitude);
  console.log(longitude);

  updateMapPosition(latitude,longitude);
  
  return statusWord;
}

async function readSensors(){
  var value = await characteristicSensors.readValue();
  let sensorsWord = new Uint8Array(value.buffer);
  console.log(sensorsWord);
  return sensorsWord;
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

function setAlarm1()
{
  if(document.getElementById("setAlarm1").checked)
  {
    // This will enable all the children of the div
    var nodes = document.getElementById("alarm1div").getElementsByTagName('*');
    for(var i = 0; i < nodes.length; i++){
        nodes[i].disabled = false;
    }
  }
  else
  {
    // This will disable all the children of the div
    var nodes = document.getElementById("alarm1div").getElementsByTagName('*');
    for(var i = 0; i < nodes.length; i++){
        nodes[i].disabled = true;
    }
  }

}

function setAlarm2()
{
  if(document.getElementById("setAlarm2").checked)
  {
    // This will enable all the children of the div
    var nodes = document.getElementById("alarm2div").getElementsByTagName('*');
    for(var i = 0; i < nodes.length; i++){
        nodes[i].disabled = false;
    }
  }
  else
  {
    // This will disable all the children of the div
    var nodes = document.getElementById("alarm2div").getElementsByTagName('*');
    for(var i = 0; i < nodes.length; i++){
        nodes[i].disabled = true;
    }
  }
}

async function setTimes() {
  
  let calendarWord = new Uint8Array(35);

  start1_hours = 0;
  end1_hours = 0;
  start2_hours = 0;
  end2_hours = 0;
  start1_minutes = 0;
  end1_minutes = 0;
  start2_minutes = 0;
  end2_minutes = 0;
  start1_seconds = 0;
  end1_seconds = 0;
  start2_seconds = 0;
  end2_seconds = 0;
  start1_days = 0;
  start2_days = 0;

  // Set current time
  const d = new Date();
  calendarWord[11]=parseInt(d.getHours().toString(),16); //parseInt to convert d.getHours to bcd
  calendarWord[12]=parseInt(d.getMinutes().toString(),16);
  calendarWord[13]=parseInt(d.getSeconds().toString(),16);

  calendarWord[7]=parseInt((d.getFullYear()-2000).toString(),16); // -2000 because rtc only take tens 
  calendarWord[8]=parseInt((d.getMonth()+1).toString(),16); // +1 because date return 0 to 11 and rtc take 1 to 12 
  calendarWord[9]=parseInt(d.getDate().toString(),16);
  calendarWord[10]=convDayofWeek(d.getDay());
  console.log(d);

  // Alarm 1
  var start1 = document.getElementById('start1').value;

  console.log(start1);
  if(document.getElementById('setAlarm1').checked)
  {
    if(start1!=='')
    {
      start1_hours = parseInt(start1.substring(0,2),16);
      start1_minutes = parseInt(start1.substring(3,5),16);
      start1_seconds = parseInt(start1.substring(6),16);

      var end1 = document.getElementById('end1').value;
      end1_hours = parseInt(end1.substring(0,2),16);
      end1_minutes = parseInt(end1.substring(3,5),16);
      end1_seconds = parseInt(end1.substring(6),16);

      if(document.getElementById('mon1').checked)
      {
        start1_days+=1;
      }
      if(document.getElementById('tue1').checked)
      {
        start1_days+=2;
      }
      if(document.getElementById('wed1').checked)
      {
        start1_days+=4;
      }
      if(document.getElementById('thu1').checked)
      {
        start1_days+=8;
      }
      if(document.getElementById('fri1').checked)
      {
        start1_days+=16;
      }
      if(document.getElementById('sat1').checked)
      {
        start1_days+=32;
      }
      if(document.getElementById('sun1').checked)
      {
        start1_days+=64;
      }
    }
    else
    {
      start1_hours = 255;
      end1_hours = 255;
      start1_minutes = 255;
      end1_minutes = 255;
      start1_seconds = 255;
      end1_seconds = 255;
    }
  }
  // Alarm 2
  var start2 = document.getElementById('start2').value;

  console.log(start2);
  if(document.getElementById('setAlarm2').checked)
  {
    if(start2!=='')
    {
      start2_hours = parseInt(start2.substring(0,2),16);
      start2_minutes = parseInt(start2.substring(3,5),16);
      start2_seconds = parseInt(start2.substring(6),16);

      var end2 = document.getElementById('end2').value;
      end2_hours = parseInt(end2.substring(0,2),16);
      end2_minutes = parseInt(end2.substring(3,5),16);
      end2_seconds = parseInt(end2.substring(6),16);

      if(document.getElementById('mon2').checked)
      {
        start2_days+=1;
      }
      if(document.getElementById('tue2').checked)
      {
        start2_days+=2;
      }
      if(document.getElementById('wed2').checked)
      {
        start2_days+=4;
      }
      if(document.getElementById('thu2').checked)
      {
        start2_days+=8;
      }
      if(document.getElementById('fri2').checked)
      {
        start2_days+=16;
      }
      if(document.getElementById('sat2').checked)
      {
        start2_days+=32;
      }
      if(document.getElementById('sun2').checked)
      {
        start2_days+=64;
      }
    }
    else
    {
      start2_hours = 255;
      end2_hours = 255;
      start2_minutes = 255;
      end2_minutes = 255;
      start2_seconds = 255;
      end2_seconds = 255;
    }
  }

  calendarWord[31] = start2_days;
  calendarWord[32] = start2_hours;
  calendarWord[33] = start2_minutes;
  calendarWord[34] = start2_seconds;

  calendarWord[39] = end2_hours;
  calendarWord[40] = end2_minutes;
  calendarWord[41] = end2_seconds;

  calendarWord[17] = start1_days;
  calendarWord[18] = start1_hours;
  calendarWord[19] = start1_minutes;
  calendarWord[20] = start1_seconds;

  calendarWord[25] = end1_hours;
  calendarWord[26] = end1_minutes;
  calendarWord[27] = end1_seconds;

  
  console.log('Resultat');
  console.log(calendarWord);
  try{
    await characteristicCalendar.writeValue(calendarWord);
  }
  catch(error){
    console.log('Argh! ' + error);
  }
  
}

function convDayofWeek(dayNum)
{
  var dayBit;

  switch(dayNum)
  {
    case 0:
      dayBit = 64;
      break;
    case 1:
      dayBit = 1;
      break;
    case 2:
      dayBit = 2;
      break;
    case 3:
      dayBit = 4;
      break;
    case 4:
      dayBit = 8;
      break;
    case 5:
      dayBit = 16;
      break;
    case 6:
      dayBit = 32;
      break;
    default:
      dayBit = 1;
      break;
  }

  return dayBit
}

function geoFindMe() {

  function success(position) {
    const latitude  = position.coords.latitude;
    const longitude = position.coords.longitude;

    console.log(latitude);
    console.log(longitude);

    var data = new Float32Array([latitude,longitude]);
    var buffer = new ArrayBuffer(data.byteLength);
    var floatView = new Float32Array(buffer).set(data);
    var byteView = new Uint8Array(buffer); //in little endian DCBA
    console.log(byteView);
    characteristicPosition.writeValue(byteView);
    updateMapPosition(latitude,longitude);
  }

  function error() {
    status.textContent = 'Unable to retrieve your location';
  }

  if (!navigator.geolocation) {
    status.textContent = 'Geolocation is not supported by your browser';
  } else {
    status.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(success, error);
  }

}

function updateMapPosition(latitude,longitude)
{
  const map = document.querySelector('#gmap_canvas');
  map.src = 'https://maps.google.com/maps?q='+latitude+','+longitude+'&maptype=satellite&z=15&output=embed'; 
}

function tempMinChange(value)
{
  document.getElementById("minTempLbl").innerHTML = "Temperature : min " + value + "°C";
}

function tempMaxChange(value)
{
  if(value <= document.getElementById("minTemp").value)
  {
    document.getElementById("maxTemp").value = parseInt(document.getElementById("minTemp").value,10) + 1;
  }
  document.getElementById("maxTempLbl").innerHTML = "max " + document.getElementById("maxTemp").value + "°C";
}

function humidityMinChange(value)
{
  document.getElementById("minHumidityLbl").innerHTML = "Humidity : min " + value + "%";
}

function humidityMaxChange(value)
{
  document.getElementById("maxHumidityLbl").innerHTML = "max " + value + "%";
}

function measurementsIntervalChange(value)
{
  document.getElementById("measurementsLbl").innerHTML = "Measurements interval : " + value + "s";
}

async function writeTemps()
{
  let sensorsWord = new Uint8Array(20);
  
  tempMin = parseInt(document.getElementById("minTemp").value*10,10);
  tempMax = parseInt(document.getElementById("maxTemp").value*10,10);

  humidityMin = parseInt(document.getElementById("minHumidity").value,10);
  humidityMax = parseInt(document.getElementById("maxHumidity").value,10);

  measurementsInterval = parseInt(document.getElementById("measurementsInt").value,10);

  sensorsWord = await readSensors();
  console.log('Read');
  console.log(sensorsWord);

  //Temp max
  sensorsWord[15] = tempMax/255;
  sensorsWord[16] = tempMax%255;

  //Temp min
  sensorsWord[17] = tempMin/255;
  sensorsWord[18] = tempMin%255;

  //Humidity max
  sensorsWord[13] = humidityMax;

  //Humidity min
  sensorsWord[14] = humidityMin;

  //Measurements period
  sensorsWord[19] = measurementsInterval;

  console.log('Resultat');
  console.log(sensorsWord);
  try{
    await characteristicSensors.writeValue(sensorsWord);
  }
  catch(error){
    console.log('Argh! ' + error);
  }
}