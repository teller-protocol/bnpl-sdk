
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { BigNumber, Wallet } from 'ethers'
import { calculateTotalPrice } from '../../lib/bnpl-helper'


chai.should()
chai.use(chaiAsPromised)




describe('BNPL Helper', () => {

    it('should calculate total price', async () => {

        let inputData = require('../../data/inputFromCra.json')
      

        let totalPrice = calculateTotalPrice( inputData.basicOrderParams  )

        expect(totalPrice).to.eql('100000000000000000')

    })


})