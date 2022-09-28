/* global ethers */
/* eslint prefer-const: "off" */

const { getSelectors, FacetCutAction } = require('./libraries/diamond.js')

async function deployDiamond () {
  const accounts = await ethers.getSigners()
  const contractOwner = accounts[0]

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
  const diamondCutFacet = await DiamondCutFacet.deploy()
  await diamondCutFacet.deployed()
  console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

  // deploy Diamond
  const Diamond = await ethers.getContractFactory('Diamond')
  const diamond = await Diamond.deploy(contractOwner.address, diamondCutFacet.address, "BlackAdam Diamond Token", "BDT", 10000)
  await diamond.deployed()
  console.log('Diamond deployed:', diamond.address)

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const DiamondInit = await ethers.getContractFactory('DiamondInit')
  const diamondInit = await DiamondInit.deploy()
  await diamondInit.deployed()
  console.log('DiamondInit deployed:', diamondInit.address)

  // deploy facets
  console.log('')
  console.log('Deploying facets')
  const FacetNames = [
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'ERC20Token'
  ]
  const cut = []
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy()
    await facet.deployed()
    console.log(`${FacetName} deployed: ${facet.address}`)
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet)
    })
  }

  // upgrade diamond with facets
  console.log('')
  console.log('Diamond Cut:', cut)
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address)
  let tx
  let receipt
  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData('init')
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall)
  console.log('Diamond cut tx: ', tx.hash)
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`)
  }
  console.log('Completed diamond cut')
  return diamond.address

    //interact with the contract
    // const res = await ethers.getContractFactory("ERC20Token");
    // const interact = await res.attach(diamond.address);


    // const _totalSupply = await interact.totalSupply()
    // const tokenName = await interact.name()

    // const Amount = ethers.utils.parseEther("1000000");

    // const minttoken = await interact.mint(Amount)
    // const bal = await interact.balanceOf(contractOwner.address)
    // const CIRCULATINGSUPPLY = await interact.circulatingSupply()
   
    // console.log("result: ", Number(_totalSupply))
    // console.log("Token Name: ", tokenName)
    // console.log("minted: ", minttoken)
    // console.log("user balance: ", Number(bal))
    // console.log("CIRCULATINGSUPPLY: ", Number(CIRCULATINGSUPPLY))

    //Deployment result
// DiamondCutFacet deployed: 0xDb3E98eE70560171a7B4F44E5CA43f5Dec5DAf08
// Diamond deployed: 0xC0acb216BA2863f30b627512d5a80568BDF2F482
// DiamondInit deployed: 0xFea77f177Bd28D45d434b2B35A548AC6D650EdC2

// Deploying facets
// DiamondLoupeFacet deployed: 0x011ebf60Ea828ec66C2ED546FfBf7555b3A4F3cd
// OwnershipFacet deployed: 0xe4C4509bcF1614aa97289E7a13d0C2f99E3d95d0
// ERC20Token deployed: 0x47E3Ef42E65b0A45a6BbbEC0CAAC1Ed0380ADF90

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.deployDiamond = deployDiamond
