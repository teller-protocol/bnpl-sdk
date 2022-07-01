
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { BigNumber, Wallet } from 'ethers'
import { buildExecuteParams } from '../../lib/bnpl-helper'


chai.should()
chai.use(chaiAsPromised)




describe('BNPL Tasks', () => {

    it('should generate execute params', async () => {

        let inputData = require('../../data/inputFromCra.json')
        
        let contractsConfig = require('../../data/contractsConfig.json')['rinkeby']

        let outputData = buildExecuteParams( inputData, contractsConfig  )

        expect(outputData).to.exist


    })


})