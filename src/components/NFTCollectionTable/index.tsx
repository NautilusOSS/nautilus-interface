import React from "react";
import { styled as mstyled } from "@mui/system";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { Box } from "@mui/material";
import { RankingI } from "../../types";
import { Link } from "react-router-dom";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const StyledImage = styled(Box)`
  width: 53px;
  height: 53px;
  flex-shrink: 0;
  border-radius: 8px;
  background-size: cover;
`;

const StyledTableCell = mstyled(TableCell)(({ theme }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    borderBottom: "none",
    padding: theme.spacing(1),
    color: isDarkTheme ? "#fff" : "#000",
  };
});

interface Props {
  rankings: RankingI[];
  collectionInfo: any[];
}

const NFTCollectionTable: React.FC<Props> = ({ rankings, collectionInfo }) => {
  return (
    <TableContainer>
      <Table aria-label="rankings table">
        <TableHead className="border-b">
          <TableRow>
            {[
              "#",
              "",
              "Collection",
              "Floor Price",
              //"Floor Change",
              "Volume",
              //"Volume Change",
              "Listings",
              "Sales",
              "Items",
              "Owners",
            ].map((header, index) => (
              <StyledTableCell className=" " key={index}>
                {header}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rankings.map((player, index) => {
            const ranking = player;
            console.log({ ranking });
            const collection = collectionInfo?.find(
              (el) => `${el.applicationID}` === `${ranking.collectionId}`
            );
            const collectionName =
              collection?.title || ranking?.name || "Collection Name";
            return (
              <TableRow key={index}>
                <StyledTableCell component="th" scope="row">
                  {index + 1}
                </StyledTableCell>
                <StyledTableCell>
                  <StyledImage
                    sx={{ backgroundImage: `url(${player.image})` }}
                  />
                </StyledTableCell>
                <StyledTableCell>
                  <Link
                    style={{ textDecoration: "none", color: "inherit" }}
                    to={`/collection/${player.collectionId}`}
                  >
                    {collectionName}
                  </Link>
                </StyledTableCell>
                <StyledTableCell>
                  {player.floorPrice === 0
                    ? "-"
                    : player.floorPrice.toLocaleString() + " VOI"}
                </StyledTableCell>
                <StyledTableCell>
                  {player.volume === 0
                    ? "-"
                    : player.volume.toLocaleString() + " VOI"}
                </StyledTableCell>
                <StyledTableCell>{player.listings}</StyledTableCell>
                <StyledTableCell>{player.sales}</StyledTableCell>
                <StyledTableCell>
                  {player.items === 0 ? "-" : player.items}
                </StyledTableCell>
                <StyledTableCell>
                  {player.owners === 0 ? "-" : player.owners}
                </StyledTableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default NFTCollectionTable;
