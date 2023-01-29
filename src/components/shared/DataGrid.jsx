import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { LocaleText } from "./DataGridLocaleText";

export default function CrudTable({
  rows,
  columns,
  rowHeight,
  onRowClick,
  disableColmunFilter,
  disableColumnMenu,
  disableColumnSelector,
  disableExtendRowFullWidth,
  disableSelectionOnClick,
  hideFooter
}) {
  return (
    <div style={{ height: 300, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        rowHeight={rowHeight}
        onRowClick={onRowClick}
        disableColumnFilter={disableColmunFilter}
        disableColumnMenu={disableColumnMenu}
        disableColumnSelector={disableColumnSelector}
        disableExtendRowFullWidth={disableExtendRowFullWidth}
        disableSelectionOnClick={disableSelectionOnClick}
        hideFooter={hideFooter}
        localeText={LocaleText}
      />
    </div>
  );
}
