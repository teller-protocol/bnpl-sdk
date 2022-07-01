
import fs from 'fs'
import { buildExecuteParams } from '../lib/bnpl-helper';

export async function generateExecuteParams(): Promise<any> {

  let inputData = require('../data/inputFromCra.json')

  //inputData.lenderAddress = "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"

  let contractsConfig = require('../data/contractsConfig.json')['rinkeby']



  let outputData = buildExecuteParams( inputData, contractsConfig  )


  try {
    fs.writeFileSync('data/output.json', JSON.stringify(outputData) );
  } catch (err) {
    console.error(err);
  }
    console.log('output ', outputData )
  
 
  return outputData 
}

