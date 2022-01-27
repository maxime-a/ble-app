/*
Example from :
https://googlechrome.github.io/samples/web-bluetooth/discover-services-and-characteristics.html?optionalServices=0x0100%2C0x0300
*/
var myDevice;
var myService = 0x0100;        
var myService2 = 0x0300;
var myCharacteristic = 0x0103;   
var myCharacteristic2 = 0x0301;

var characteristicStatus;
var characteristicActuators;

async function connect() {
  // Validate services UUID entered by user first.
  let servicesNeeded = [myService,myService2];

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
        if(characteristic.uuid === "00000301-0000-1000-8000-00805f9b34fb")
        {
          characteristic.startNotifications();
          subscribeToChangesMeasurements(characteristic);
        }
      });
    }
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
  document.getElementById('actuatorsNotify').innerHTML = "0x"+buf.toString();
}

function handleDataMeasurements(event) {
  // get the data buffer from the meter:
  var buf = new Uint8Array(event.target.value.buffer);
  document.getElementById('measurementsNotify').innerHTML = "0x"+buf.toString();
}

async function readStatus(){
  var value = await characteristicStatus.readValue();
  let statusWord = new Uint8Array(value.buffer);
  console.log(statusWord);
  console.log(statusWord[0]);
  console.log(statusWord[1]);
  document.getElementById('status').innerHTML = "0x"+buf.toString();
  return statusWord;
}

async function readActuators(){
  var value = await characteristicActuators.readValue();
  let statusWord = new Uint8Array(value.buffer);
  console.log(statusWord);
  console.log(statusWord[0]);
  console.log(statusWord[1]);
  document.getElementById('actuators').innerHTML = "0x"+buf.toString();
  return statusWord;
}

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
