## BNPL SDK 



### Pre-requisites 

Deploy the BNPL Marketplace contract and put the address of the proxy in ./data/contractsConfig.json 

Fetch the result of the CRA server and put it in inputOrder.json 

On the TellerV2 contract that the BNPL marketplace is built on top of, be sure to set the trustedForwarder for the market# to be the BNPL marketplace proxy contract.   Also be sure to make the lender and borrower addresses approve the BNPL marketplace proxy contract as a trusted forwarder.  



### Run Tasks

yarn task generateExecuteParams

yarn task callExecute