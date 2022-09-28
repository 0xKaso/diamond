// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* 钻石协议的落地
/******************************************************************************/

import { LibDiamond } from "./libraries/LibDiamond.sol";
import { IDiamondCut } from "./interfaces/IDiamondCut.sol";
import { TokenStorage } from "./libraries/LibERC20.sol";
import { ERC20Token } from "../contracts/facets/ERC20Token.sol";

contract Diamond {   
    TokenStorage internal s; 
    //ERC20Token internal e;
    constructor(address _contractOwner, address _diamondCutFacet, string memory name_, string memory symbol_, uint totalSupply_) payable {        
        LibDiamond.setContractOwner(_contractOwner);
        


        // Add the diamondCut external function from the diamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: _diamondCutFacet, 
            action: IDiamondCut.FacetCutAction.Add, 
            functionSelectors: functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");  
        
        s._name = name_;
        s._symbol = symbol_;
        s._totalSupply = totalSupply_ * 1e18;
    }

    // 为被调用的函数寻找面，并在找到面的情况下执行该 如果找到一个面，则执行该函数，并返回任何值。
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // 拿到钻石的存储位置
        assembly {
            ds.slot := position
        }
        // 从函数选择器中获得切面
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");
        // 使用delegatecall从面执行外部函数，并返回值
        assembly {
            // 从函数选择器中复制值
            calldatacopy(0, 0, calldatasize())
            // 使用面来执行函数调用
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // 获得返回值
            returndatacopy(0, 0, returndatasize())
            // 返回值或者返回错误
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

    receive() external payable {}
}
