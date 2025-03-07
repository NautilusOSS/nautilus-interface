import React, { useEffect, useState } from "react";
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
import { Avatar, Box, Chip, Typography } from "@mui/material";
import { RankingI } from "../../types";
import { Link } from "react-router-dom";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import { compactAddress } from "@/utils/mp";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";

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
  collections: Collection[];
  onCreatorFilter?: (creator: string) => void;
  creatorFilter?: string;
}

interface Collection {
  contractId: number;
  featured?: boolean;
  totalSupply: number;
  uniqueOwners: number;
  creator: string;
  price: number;
  maxSupply: number;
  launchStart: number;
  launchEnd: number;
  image: string;
  name: string;
  description: string;
  activeListings: number;
  floorPrice: number | null;
  nostats?: number;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  volumeAllTime: number;
  floor: number;
}

type SortField =
  | "name"
  | "volume24h"
  | "volume7d"
  | "volume30d"
  | "volumeAllTime"
  | "floor"
  | "featured"
  | "price"
  | "floorPrice"
  | "totalSupply"
  | "uniqueOwners"
  | "activeListings"
  | "launchStart";
type SortDirection = "asc" | "desc";

type ViewMode = "compact" | "list";

const NFTCollectionTable: React.FC<Props> = ({
  collections = [],
  onCreatorFilter,
  creatorFilter,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { resolver } = useEnvoiResolver();

  // Add sort state
  const [sortField, setSortField] = useState<SortField>("volumeAllTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Add state for creator names and profiles
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, any>>(
    {}
  );

  // Add state for view mode
  const [viewMode, setViewMode] = useState<ViewMode>("compact");

  // Add effect to resolve creator names and profiles
  useEffect(() => {
    collections.forEach((collection) => {
      if (collection.creator) {
        resolver.http
          .getNameFromAddress(collection.creator)
          .then((res: string[]) => {
            if (res.length > 0 && !!res[0]) {
              setCreatorNames((prev) => ({
                ...prev,
                [collection.creator]: res[0],
              }));
              resolver.http.search(res[0]).then((searchRes: any) => {
                if (searchRes.length === 1) {
                  setCreatorProfiles((prev) => ({
                    ...prev,
                    [collection.creator]: searchRes[0],
                  }));
                }
              });
            } else {
              setCreatorNames((prev) => ({
                ...prev,
                [collection.creator]: compactAddress(collection.creator),
              }));
            }
          });
      }
    });
  }, [collections]);

  // Helper function for avatar background color
  const getColorFromAddress = (address: string) => {
    const hash = address.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 50%)`;
  };

  // Add sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Add sorted collections
  const sortedCollections = [...collections].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const comparison = aValue > bValue ? 1 : -1;
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Add view mode handler
  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Update the table headers
  const headers = [
    { label: "#", sortable: false },
    { label: "", sortable: false },
    { label: "Collection", field: "name" as SortField, sortable: true },
    { label: "Floor", field: "floorPrice" as SortField, sortable: true },
    { label: "Volume (24h)", field: "volume24h" as SortField, sortable: true },
    { label: "Volume (7d)", field: "volume7d" as SortField, sortable: true },
    { label: "Volume (30d)", field: "volume30d" as SortField, sortable: true },
    {
      label: "Volume (All Time)",
      field: "volumeAllTime" as SortField,
      sortable: true,
    },
    { label: "Creator", field: "creator" as SortField, sortable: true },
  ];

  return (
    <>
      {/*<Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          aria-label="view mode"
          size="small"
        >
          <ToggleButton value="compact" aria-label="compact view">
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>*/}
      <TableContainer>
        <Table
          aria-label="collections table"
          size={viewMode === "compact" ? "small" : "medium"}
        >
          <TableHead className="border-b">
            <TableRow>
              {headers.map((header, index) => (
                <StyledTableCell
                  key={index}
                  onClick={() => header.sortable && handleSort(header.field)}
                  sx={{
                    cursor: header.sortable ? "pointer" : "default",
                    "&:hover": header.sortable
                      ? {
                          backgroundColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(0, 0, 0, 0.04)",
                        }
                      : {},
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2">{header.label}</Typography>
                    {header.sortable &&
                      header.field === sortField &&
                      (sortDirection === "asc" ? (
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                      ))}
                  </Box>
                </StyledTableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCollections.map((collection, index) => (
              <TableRow
                key={collection.contractId}
                sx={{
                  "&:hover": {
                    backgroundColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.04)",
                  },
                  // Add height adjustment for compact view
                  "& .MuiTableCell-root": {
                    padding: viewMode === "compact" ? "8px" : "16px",
                  },
                }}
              >
                <StyledTableCell component="th" scope="row">
                  {index + 1}
                </StyledTableCell>
                <StyledTableCell>
                  <StyledImage
                    sx={{
                      backgroundImage: `url(${
                        collection.image || "/placeholder.png"
                      })`,
                    }}
                  />
                </StyledTableCell>
                <StyledTableCell>
                  <Link
                    style={{ textDecoration: "none", color: "inherit" }}
                    to={`/collection/${collection.contractId}`}
                  >
                    {collection.name || `Collection #${collection.contractId}`}
                  </Link>
                </StyledTableCell>
                {/*<StyledTableCell>
                  {collection.nostats === 1
                    ? ""
                    : collection.price === 0
                    ? "-"
                    : collection.price.toLocaleString() + " VOI"}
                </StyledTableCell>*/}
                <StyledTableCell>
                  <span
                    style={{
                      opacity: collection.floorPrice === 0 ? 0.25 : 1,
                    }}
                  >
                    {formatter.format(collection.floorPrice)}
                  </span>
                </StyledTableCell>
                <StyledTableCell>
                  <span
                    style={{
                      opacity: collection.volume24h === 0 ? 0.25 : 1,
                      fontWeight:
                        collection.volume24h >= 1000000
                          ? 900
                          : collection.volume24h >= 1000
                          ? 500
                          : 100,
                    }}
                  >
                    {formatter.format(collection.volume24h)}
                  </span>
                </StyledTableCell>
                <StyledTableCell>
                  <span
                    style={{
                      opacity: collection.volume7d === 0 ? 0.25 : 1,
                      fontWeight:
                        collection.volume7d >= 1000000
                          ? 900
                          : collection.volume7d >= 1000
                          ? 500
                          : 100,
                    }}
                  >
                    {formatter.format(collection.volume7d)}
                  </span>
                </StyledTableCell>
                <StyledTableCell>
                  <span
                    style={{
                      opacity: collection.volume30d === 0 ? 0.5 : 1,
                      fontWeight:
                        collection.volume30d >= 1000000
                          ? 900
                          : collection.volume30d >= 1000
                          ? 500
                          : 100,
                    }}
                  >
                    {formatter.format(collection.volume30d)}
                  </span>
                </StyledTableCell>
                <StyledTableCell>
                  <span
                    style={{
                      opacity: collection.volumeAllTime === 0 ? 0.25 : 1,
                      fontWeight:
                        collection.volumeAllTime >= 1000000
                          ? 900
                          : collection.volumeAllTime >= 1000
                          ? 500
                          : 100,
                    }}
                  >
                    {formatter.format(collection.volumeAllTime)}
                  </span>
                </StyledTableCell>
                {/*<StyledTableCell>
                  {collection.nostats === 1
                    ? ""
                    : `${collection.totalSupply}${
                        collection.maxSupply ? `/${collection.maxSupply}` : ""
                      }`}
                </StyledTableCell>*/}
                {/*<StyledTableCell>
                  {collection.nostats === 1 ? "" : collection.uniqueOwners || "-"}
                </StyledTableCell>*/}
                {/*<StyledTableCell>
                  {collection.nostats == 1
                    ? ""
                    : collection.activeListings || "-"}
                </StyledTableCell>*/}
                {/*<StyledTableCell>
                  {collection.nostats
                    ? ""
                    : collection.launchStart
                    ? new Date(collection.launchStart * 1000).toLocaleDateString()
                    : "-"}
                </StyledTableCell>*/}
                <StyledTableCell>
                  {collection.creator && (
                    <Link
                      to={`/account/${collection.creator}`}
                      style={{ textDecoration: "none" }}
                      onClick={(e) => {
                        e.preventDefault();
                        if (creatorFilter === collection.creator) {
                          onCreatorFilter?.(undefined);
                        } else {
                          onCreatorFilter?.(collection.creator);
                        }
                      }}
                    >
                      <Chip
                        avatar={
                          <Avatar
                            src={
                              creatorProfiles[collection.creator]?.metadata
                                ?.avatar || undefined
                            }
                            alt={creatorNames[collection.creator] || ""}
                            sx={{
                              bgcolor: !creatorProfiles[collection.creator]
                                ?.metadata?.avatar
                                ? compactAddress(collection.creator) ===
                                  creatorNames[collection.creator]
                                  ? "silver"
                                  : getColorFromAddress(collection.creator)
                                : undefined,
                            }}
                          >
                            {!creatorProfiles[collection.creator]?.metadata
                              ?.avatar &&
                              (creatorNames[collection.creator] ||
                                "")[0]?.toUpperCase()}
                          </Avatar>
                        }
                        label={creatorNames[collection.creator] || "-"}
                        variant="outlined"
                        sx={{
                          color: isDarkTheme ? "#fff" : "inherit",
                          borderColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.23)"
                            : "rgba(0, 0, 0, 0.23)",
                          "& .MuiChip-label": {
                            maxWidth: "120px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                    </Link>
                  )}
                </StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default NFTCollectionTable;
