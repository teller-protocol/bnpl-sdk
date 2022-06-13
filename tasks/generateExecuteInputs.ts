


export async function generateExecuteInputs(): Promise<any> {

  let inputData = require('../data/inputOrder.json')

  inputData.lenderAddress = "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"

  let outputData = buildExecuteParams( inputData  )


  try {
    fs.writeFileSync('data/output.json', JSON.stringify(outputData) );
  } catch (err) {
    console.error(err);
  }
    console.log('output ', outputData )
  
 
  return true 
}

