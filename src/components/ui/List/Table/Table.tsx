import {
  Table as FrokTable,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
} from "@bosch/react-frok";
import "./Table.scss";
import { useTranslation } from "react-i18next";
import { TableProps } from "./Table.types";
import { useAnalytics, ListInteractionType } from "@/analytics";

function Table<T>({
  data,
  columns,
  visibleColumns,
  getRowKey,
  onRowClick,
  renderRowActions,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  isRowSelectable,
  emptyListMessage = "noDataFound",
}: Readonly<TableProps<T>>) {
  const visibleColumnDefs = columns.filter((col) => visibleColumns.includes(col.key));
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const analytics = useAnalytics();

  const allRowKeys = data.map(getRowKey);
  const selectableRowKeys = isRowSelectable
    ? data.filter(isRowSelectable).map(getRowKey)
    : allRowKeys;
  const allSelected =
    selectable &&
    selectableRowKeys.length > 0 &&
    selectableRowKeys.every((key) => selectedRows.includes(key));

  const trackSelection = (nextSelection: string[]) => {
    analytics.trackListInteraction({
      interactionType: ListInteractionType.ROWS_SELECTED,
      selectedRowCount: nextSelection.length,
    });
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const next = allSelected ? [] : selectableRowKeys;
    if (selectableRowKeys.length > 0) trackSelection(next);
    onSelectionChange(next);
  };

  const handleSelectRow = (rowKey: string) => {
    if (!onSelectionChange) return;
    const next = selectedRows.includes(rowKey)
      ? selectedRows.filter((key) => key !== rowKey)
      : [...selectedRows, rowKey];
    trackSelection(next);
    onSelectionChange(next);
  };

  // Wraps onRowClick so the click and the Enter-key path are both counted from one place.
  const handleRowOpen = (row: T) => {
    if (!onRowClick) return;
    analytics.trackListInteraction({ interactionType: ListInteractionType.ROW_OPENED });
    onRowClick(row);
  };

  return (
    <div className="job-table-wrapper">
      <FrokTable className="job-table">
        <TableHead>
          <TableRow>
            {selectable ? (
              <TableCell key="checkbox-header" header width="auto" className="checkbox-cell">
                <Checkbox
                  id="select-all-checkbox"
                  label=""
                  checked={allSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleSelectAll}
                />
              </TableCell>
            ) : (
              <></>
            )}
            {visibleColumnDefs.map((column) => (
              <TableCell key={column.key} header data-testid={`header-${column.key}`}>
                {column.label}
              </TableCell>
            ))}
            <TableCell key="actions-header" header width="auto" />
          </TableRow>
        </TableHead>

        {data.length > 0 ? (
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={getRowKey(row)}
                className={`${onRowClick ? "clickable-row" : ""}${selectable && selectedRows.includes(getRowKey(row)) ? " selected-row" : ""}`}
                tabIndex={onRowClick ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRowOpen(row);
                  }
                }}
              >
                {selectable ? (
                  <TableCell
                    key={`${getRowKey(row)}-checkbox`}
                    width="auto"
                    className="checkbox-cell"
                  >
                    <Checkbox
                      id={`row-checkbox-${getRowKey(row)}`}
                      label=""
                      checked={selectedRows.includes(getRowKey(row))}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectRow(getRowKey(row))}
                      disabled={isRowSelectable ? !isRowSelectable(row) : false}
                    />
                  </TableCell>
                ) : (
                  <></>
                )}
                {visibleColumnDefs.map((column) => (
                  <TableCell
                    key={column.key}
                    data-testid={`body-${column.key}`}
                    onClick={() => {
                      handleRowOpen(row);
                    }}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}

                <TableCell key={`${getRowKey(row)}-actions`} width="auto">
                  {renderRowActions(row)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        ) : (
          <TableBody>
            <TableRow>
              <TableCell colSpan={visibleColumns.length + (selectable ? 2 : 1)}>
                <p className="no-jobs-found-message">{t(emptyListMessage)}</p>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </FrokTable>
    </div>
  );
}

export default Table;
