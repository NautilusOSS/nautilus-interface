import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import Pagination from "@/components/Pagination";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { toast } from "react-toastify";
import VIAIcon from "/src/static/crypto-icons/voi/6779767.svg";
import moment from "moment";
import { Link } from "react-router-dom";
import BuySaleModal from "@/components/modals/BuySaleModal2";
import MarketTableRow from "./MarketTableRow";

interface MarketTableProps {
  marketData: any[]; // Replace 'any' with a more specific type if available
}

type SortDirection = "asc" | "desc" | null;
type SortColumn =
  | "totalStaked"
  | "lockup"
  | "vesting"
  | "unlock"
  | "discount"
  | "price"
  | null;

const MarketTable: React.FC<MarketTableProps> = ({ marketData }) => {
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const theme = useTheme();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("discount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const tableStyle = {
    backgroundColor: "transparent",
    borderRadius: "8px",
    marginTop: "25px",
  };

  const cellStyle = {
    color: isDarkTheme ? "white" : theme.palette.text.primary,
    fontWeight: 100,
  };

  const headCellStyle = {
    ...cellStyle,
    backgroundColor: isDarkTheme
      ? theme.palette.grey[800]
      : theme.palette.grey[200],
    fontWeight: 900,
  };

  const headRowStyle = {
    borderBottom: "none",
  };

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(marketData.length / itemsPerPage);
  const showPagination = marketData.length > itemsPerPage;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };

  const handleOpenModal = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsModalOpen(false);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return marketData;

    return [...marketData].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      // Special handling for specific columns
      if (sortColumn === "unlock") {
        aValue = moment.unix(a.unlock).valueOf();
        bValue = moment.unix(b.unlock).valueOf();
      } else if (sortColumn === "discount") {
        aValue = parseFloat(a.discount);
        bValue = parseFloat(b.discount);
      } else if (sortColumn === "totalStaked" || sortColumn === "price") {
        aValue = Number(a[sortColumn]);
        bValue = Number(b[sortColumn]);
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [marketData, sortColumn, sortDirection]);

  const SortableHeader: React.FC<{
    column: SortColumn;
    children: React.ReactNode;
  }> = ({ column, children }) => (
    <Box
      component="span"
      sx={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        "&:hover": { opacity: 0.8 },
      }}
      onClick={() => handleSort(column)}
    >
      {children}
      {sortColumn === column && (
        <Box component="span" sx={{ ml: 1 }}>
          {sortDirection === "asc" ? (
            <ArrowUpwardIcon fontSize="small" />
          ) : (
            <ArrowDownwardIcon fontSize="small" />
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <TableContainer component={Paper} style={tableStyle}>
        <Table>
          <TableHead>
            <TableRow style={headRowStyle}>
              {/*<TableCell style={headCellStyle} align="right">
                Token
              </TableCell>*/}
              <TableCell style={headCellStyle} align="center">
                Account
              </TableCell>
              <TableCell style={headCellStyle} align="right">
                <SortableHeader column="totalStaked">Value</SortableHeader>
              </TableCell>
              <TableCell style={headCellStyle} align="right">
                <SortableHeader column="lockup">Lockup</SortableHeader>
              </TableCell>
              <TableCell style={headCellStyle} align="right">
                <SortableHeader column="vesting">Vesting</SortableHeader>
              </TableCell>
              <TableCell style={headCellStyle} align="right">
                <SortableHeader column="unlock">Unlock</SortableHeader>
              </TableCell>
              <TableCell style={headCellStyle} align="right">
                <SortableHeader column="discount">Discount</SortableHeader>
              </TableCell>
              <TableCell style={headCellStyle} align="right">
                <SortableHeader column="price">Price</SortableHeader>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((item) => (
                <MarketTableRow
                  key={item.contractId}
                  item={item}
                  isDarkTheme={isDarkTheme}
                  onOpenModal={handleOpenModal}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          isDarkTheme={isDarkTheme}
        />
      )}
      {selectedItem && (
        <BuySaleModal
          open={isModalOpen}
          onClose={handleCloseModal}
          item={selectedItem}
        />
      )}
    </>
  );
};

export default MarketTable;
