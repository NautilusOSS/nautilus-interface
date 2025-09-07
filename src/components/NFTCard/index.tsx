import React from "react";
import styled from "styled-components";
import { Avatar, Tooltip } from "@mui/material";
import { stringToColorCode } from "../../utils/string";
import VoiIcon from "../../static/crypto-icons/voi/0.svg";
import ViaIcon from "../../static/crypto-icons/voi/6779767.svg";

const NFTCardWrapper = styled.div`
  align-items: center;
  /*
  background: linear-gradient(
    180deg,
    rgb(245, 211, 19) 0%,
    rgb(55, 19, 18) 100%
  );
  background-color: rgba(255, 255, 255, 1);
  */
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.1s ease;
  height: 350px;
  /*
  width: 305px;
  */
  overflow: hidden;
  cursor: pointer;
  justify-content: flex-end;
  &:hover {
    /*
    transform: scale(1.05);
    */
  }
  & .image {
    align-self: stretch;
    //height: 305px;
    position: relative;
    width: 100%;
    height: 200px;
  }
  &:hover .NFT-info {
    height: 100px;
    background-color: #202020a0;
    transition: all 0.1s ease;
  }
  & .NFT-info {
    -webkit-backdrop-filter: blur(200px) brightness(100%);
    align-items: flex-start;
    align-self: stretch;
    backdrop-filter: blur(200px) brightness(100%);
    background-color: #40404060;
    border-radius: 0px 0px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    //height: 176px;
    padding: 20px 30px 25px;
    position: relative;
    width: 100%;
    height: 120px;
  }

  & .frame {
    align-items: center;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    gap: 25px;
    position: relative;
    width: 100%;
  }

  & .artist-avatar-name-wrapper {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    justify-content: space-around;
    position: relative;
  }

  & .artist-avatar-name {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    position: relative;
  }

  & .avatar-instance {
    background-image: url(./avatar.svg) !important;
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .text-wrapper {
    color: white;
    flex: 1;
    position: relative;
    font-family: Inter;
    font-size: 16px;
    font-weight: 500;
    line-height: 22px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .highest-bid {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 16px;
    justify-content: flex-end;
    position: relative;
  }

  & .div {
    align-items: center;
    background-color: #ffffff33;
    border-radius: 100px;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 10px;
    justify-content: flex-end;
    padding: 6px;
    position: relative;
  }

  & .icon-instance-node {
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .artst-info {
    align-items: flex-start;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 5px;
    position: relative;
    width: 100%;
  }

  & .text-wrapper-2 {
    align-self: stretch;
    color: white;
    line-height: 24px;
    margin-top: -1px;
    position: relative;
    font-family: Inter, Helvetica;
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: 0em;
    text-align: left;
    word-wrap: break-word;
    width: 204px;
  }

  & .additional-info {
    align-items: flex-end;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-end;
    position: relative;
    width: 100%;
  }

  & .price {
    align-items: flex-start;
    display: flex;
    flex: 1;
    flex-direction: column;
    flex-grow: 1;
    gap: 8px;
    padding: 0px 21px 0px 0px;
    position: relative;
  }

  & .text-wrapper-3 {
    align-self: stretch;
    color: #ffffff;
    font-family: Inter, Helvetica;
    margin-top: -1px;
    position: relative;
    font-family: Inter;
    font-size: 14px;
    font-weight: 400;
    line-height: 15px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .text-wrapper-4 {
    display: flex;
    align-items: center;
    gap: 5px;
    align-self: stretch;
    color: white;
    position: relative;
    font-family: monospace;
    font-size: 18px;
    font-weight: 700;
    line-height: 20px;
    letter-spacing: 0em;
    text-align: left;
  }
`;

export interface NFTCardProps {
  nftName: string;
  image: string;
  owner: string;
  price: string;
  currency: string;
  onClick: any;
}

const NftCard: React.FC<NFTCardProps> = ({
  nftName,
  image,
  owner,
  price,
  currency,
  onClick,
}) => {
  return (
    <NFTCardWrapper
      onClick={onClick}
      style={{
        background: `url(${image})`,
        backgroundSize: "contain",
        backgroundPositionX: "center",
        backgroundPositionY: "top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="NFT-info">
        <div className="artst-info">
          <div className="text-wrapper-2">{nftName}</div>
        </div>
        <div className="additional-info">
          {price ? (
            <div className="price">
              <div className="text-wrapper-3">Price</div>
              <div className="text-wrapper-4">
                <div style={{ display: "inline-block" }}>
                  {currency === "VOI" ? (
                    <Tooltip placement="top" title="VOI">
                      <img
                        src={VoiIcon}
                        alt="VOI"
                        style={{
                          height: "20px",
                          width: "20px",
                          position: "relative",
                        }}
                      />
                    </Tooltip>
                  ) : null}
                  {currency !== "VOI" ? (
                    <Tooltip placement="top" title={currency}>
                      <img
                        src={ViaIcon}
                        alt={currency}
                        style={{
                          height: "20px",
                          width: "20px",
                          position: "relative",
                        }}
                      />
                    </Tooltip>
                  ) : null}
                </div>
                <div style={{ display: "inline-block" }}>{price}</div>
                <div style={{ display: "inline-block" }}>{currency}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </NFTCardWrapper>
  );
};

export default NftCard;
