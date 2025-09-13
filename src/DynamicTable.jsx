/* src/DynamicTable.jsx */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from "docx";

const cellClass =
  "p-2 min-w-[90px] md:min-w-[140px] border border-transparent focus-within:border-sky-300 rounded";

export default function DynamicTable() {
  const [table, setTable] = useState([[""]]); // rows x cols
  const [hoverCol, setHoverCol] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const tableRef = useRef(null);

  // Add Row
  const addRow = () =>
    setTable((prev) => [...prev, Array(prev[0].length).fill("")]);

  // Add Column
  const addColumn = () => setTable((prev) => prev.map((r) => [...r, ""]));

  // Delete Row
  const deleteRow = (index) => {
    if (table.length === 1) return;
    setTable((prev) => prev.filter((_, i) => i !== index));
  };

  // Delete Column
  const deleteColumn = (colIndex) => {
    if (table[0].length === 1) return;
    setTable((prev) => prev.map((row) => row.filter((_, j) => j !== colIndex)));
  };

  // Handle cell value
  const handleInput = (r, c, v) => {
    setTable((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[r][c] = v;
      return copy;
    });
  };

  // Keyboard: Enter to add row on last cell
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter") {
        const active = document.activeElement;
        if (!active) return;
        if (active.dataset.r && active.dataset.c) {
          const r = Number(active.dataset.r),
            c = Number(active.dataset.c);
          if (r === table.length - 1 && c === table[0].length - 1) addRow();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [table]);

  // Exports ---------------------------------------------------------
  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 40,
      topStart = 40,
      lineHeight = 18;
    table.forEach((row, i) => {
      const line = row.join("   |   ");
      doc.text(line, left, topStart + i * lineHeight);
    });
    doc.save("table.pdf");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Table");
    XLSX.writeFile(wb, "table.xlsx");
  };

  const exportWord = async () => {
    const maxCols = Math.max(...table.map((r) => r.length));
    const rows = table.map((row) => {
      const padded = [...row];
      while (padded.length < maxCols) padded.push("");
      return new TableRow({
        children: padded.map(
          (cell) =>
            new TableCell({
              width: { size: 2000, type: WidthType.DXA },
              children: [new Paragraph(cell || " ")],
            })
        ),
      });
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph(" "),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "table.docx";
    link.click();
  };

  const exportTable = async (choice) => {
    setShowExportMenu(false);
    const lower = (choice || "").toLowerCase();
    if (lower === "pdf") exportPDF();
    else if (lower === "excel") exportExcel();
    else if (lower === "word") await exportWord();
    else if (!choice) {
      // fallback: ask
      const pick = prompt("Export as: PDF / Excel / Word ?") || "";
      exportTable(pick);
    }
  };

  // Touch ripple helper
  const ripple = (e) => {
    const target = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.nativeEvent.offsetX - radius}px`;
    circle.style.top = `${e.nativeEvent.offsetY - radius}px`;
    circle.className =
      "ripple absolute rounded-full opacity-30 bg-sky-300 animate-ripple pointer-events-none";
    target.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  };

  // UI ----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-800">
              Dynamic Table Builder
            </h1>
            <p className="text-sm text-slate-500">
              Minimal · responsive · fast interactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowExportMenu((v) => !v);
              }}
              className="relative inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded shadow hover:scale-[1.02] active:scale-[0.99]"
              onMouseDown={ripple}
            >
              📤 Export
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-white rounded shadow p-2 grid grid-cols-1 gap-2 text-sm"
                >
                  <button
                    onClick={() => exportTable("pdf")}
                    className="px-3 py-1 hover:bg-slate-50 rounded"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => exportTable("excel")}
                    className="px-3 py-1 hover:bg-slate-50 rounded"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => exportTable("word")}
                    className="px-3 py-1 hover:bg-slate-50 rounded"
                  >
                    Word
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="overflow-auto rounded bg-white shadow-sm p-4">
          <div ref={tableRef} className="inline-block">
            <table className="table-auto border-collapse">
              <tbody>
                {table.map((row, ridx) => (
                  <motion.tr
                    key={`r-${ridx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.001 }}
                    onMouseEnter={() => setHoverRow(ridx)}
                    onMouseLeave={() => setHoverRow(null)}
                    className={`${hoverRow === ridx ? "bg-slate-50" : ""}`}
                  >
                    {row.map((cell, cidx) => (
                      <motion.td
                        key={`c-${cidx}`}
                        onMouseEnter={() => setHoverCol(cidx)}
                        onMouseLeave={() => setHoverCol(null)}
                        className={`align-top ${cellClass}`}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="relative">
                          <input
                            data-r={ridx}
                            data-c={cidx}
                            value={cell}
                            onChange={(e) =>
                              handleInput(ridx, cidx, e.target.value)
                            }
                            className="w-full bg-transparent outline-none text-sm md:text-base"
                            placeholder={ridx === 0 ? `Header ${cidx + 1}` : ""}
                            onTouchStart={ripple}
                          />
                        </div>
                      </motion.td>
                    ))}
                    <td className="pl-2 align-top">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => addRow()}
                          className="text-xs md:text-sm bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded"
                        >
                          + Row
                        </button>
                        <button
                          onClick={() => deleteRow(ridx)}
                          className="text-xs md:text-sm bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}

                {/* column control row (visual only) */}
                <tr>
                  {table[0].map((_, cidx) => (
                    <td key={`colctrl-${cidx}`} className="p-2">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => addColumn()}
                          className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded"
                        >
                          + Col
                        </button>
                        <button
                          onClick={() => deleteColumn(cidx)}
                          className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded"
                        >
                          Delete Col
                        </button>
                      </div>
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating action area */}
        <div className="fixed right-6 bottom-6 z-40">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => addRow()}
            className="bg-sky-600 text-white rounded-full w-14 h-14 shadow-lg grid place-items-center text-2xl"
            aria-label="add row"
            onMouseDown={ripple}
          >
            +
          </motion.button>
        </div>
      </div>

      {/* small ripple animation style */}
      <style>{`
        .ripple { transform: translate(-50%, -50%); }
        @keyframes rippleAnim {
          from { transform: scale(0.1); opacity: 0.6; }
          to { transform: scale(1.6); opacity: 0; }
        }
        .animate-ripple { animation: rippleAnim 600ms linear; }
      `}</style>
    </div>
  );
}
