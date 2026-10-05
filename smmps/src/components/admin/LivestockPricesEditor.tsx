"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Edit2, X, Plus, Trash2 } from "lucide-react";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import {
  LIVESTOCK_PRICE_SECTIONS,
  LIVESTOCK_COLUMNS,
  type LivestockColumnKey,
} from "@/lib/livestock-data";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

interface EditingPrice {
  sectionId: string;
  rowIndex: number;
  columnKey: LivestockColumnKey;
  value: string;
}

interface SectionData {
  [sectionId: string]: {
    rows: Record<string, Record<LivestockColumnKey, string>>;
    updatedAt?: string;
    updatedBy?: string;
  };
}

const SEASON_INFO: Record<string, { color: string; description: string }> = {
  "barimada-caadiga": {
    color: "from-yellow-400 to-amber-500",
    description: "Normal Season (Xiliga Caadiga)",
  },
  sekontada: {
    color: "from-cyan-400 to-sky-500",
    description: "Secondary Stock",
  },
  "barimada-jilaal": {
    color: "from-red-500 to-rose-600",
    description: "Dry Season (Xiliga Jilaalka)",
  },
  "sekontada-alt": {
    color: "from-violet-500 to-purple-600",
    description: "Market Variation",
  },
};

export function LivestockPricesEditor() {
  const { lang, t } = useLang();
  const [sectionData, setSectionData] = useState<SectionData>({});
  const [editingCell, setEditingCell] = useState<EditingPrice | null>(null);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const initializeSection = async (sectionId: string) => {
    const section = LIVESTOCK_PRICE_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    let savedRows: Record<string, Record<LivestockColumnKey, string>> | null = null;
    try {
      const res = await fetch(
        `/api/admin/livestock-prices?season=${encodeURIComponent(sectionId)}&category=all`,
        { credentials: "same-origin", cache: "no-store" }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { prices?: Record<string, Record<LivestockColumnKey, string>> };
        };
        if (json.data?.prices && typeof json.data.prices === "object") {
          savedRows = json.data.prices;
        }
      }
    } catch {
      /* fall back to seed section rows */
    }

    setSectionData((prev) => {
      if (prev[sectionId]) return prev;

      const rows: Record<string, Record<LivestockColumnKey, string>> = {};
      section.rows.forEach((row, index) => {
        const saved = savedRows?.[String(index)] || savedRows?.[index as never];
        rows[index] = {
          geel: saved?.geel ?? row.geel,
          loda: saved?.loda ?? row.loda,
          arri: saved?.arri ?? row.arri,
        };
      });

      return {
        ...prev,
        [sectionId]: { rows },
      };
    });
  };

  const handleCellClick = (
    sectionId: string,
    rowIndex: number,
    columnKey: LivestockColumnKey
  ) => {
    const currentValue = sectionData[sectionId]?.rows?.[rowIndex]?.[columnKey] || "";
    setEditingCell({ sectionId, rowIndex, columnKey, value: currentValue });
    setEditValue(currentValue);
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;

    setSectionData((prev) => {
      const updated = { ...prev };
      if (!updated[editingCell.sectionId]) {
        updated[editingCell.sectionId] = { rows: {} };
      }
      if (!updated[editingCell.sectionId].rows[editingCell.rowIndex]) {
        updated[editingCell.sectionId].rows[editingCell.rowIndex] = {
          geel: "",
          loda: "",
          arri: "",
        };
      }
      updated[editingCell.sectionId].rows[editingCell.rowIndex][
        editingCell.columnKey
      ] = editValue;
      return updated;
    });

    setEditingCell(null);
    setEditValue("");
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(sectionData).map(async ([sectionId, data]) => {
        const response = await fetch("/api/admin/livestock-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            season: sectionId,
            category: "all",
            prices: data.rows,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${sectionId}`);
        }

        return response.json();
      });

      await Promise.all(updates);
      setMessage({
        type: "success",
        text: t("All livestock prices saved successfully!", "Dhammaan qiimaha xoolaha si guul leh ayaa loo kaydiyay!"),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("Failed to save prices", "Qiimaha lama kaydin karin");
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 p-6">
        <div className="flex items-center gap-3">
          <Edit2 className="h-6 w-6 text-amber-600" />
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {t("Livestock Prices Editor (2016-2026)", "Tifaftiraha qiimaha xoolaha (2016-2026)")}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t(
                "Edit reference prices for Camels, Cattle, and Sheep & goats across all seasons",
                "Wax ka beddel qiimaha tixraaca ee Geelka, Lo'da, iyo Arriga xilliyada oo dhan"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border-2 p-4",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <p
              className={
                message.type === "success"
                  ? "text-emerald-900 font-medium"
                  : "text-red-900 font-medium"
              }
            >
              {message.text}
            </p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {LIVESTOCK_PRICE_SECTIONS.map((section) => {
          const info = SEASON_INFO[section.id];
          const isInitialized = !!sectionData[section.id];

          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm"
            >
              {/* Section Header */}
              <div className={cn("bg-gradient-to-r px-6 py-4", info.color)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {lang === "so" ? section.titleSomali : section.titleEnglish}
                    </h3>
                  </div>
                  <button
                    onClick={() => void initializeSection(section.id)}
                    className={cn(
                      "rounded-lg px-4 py-2 font-semibold transition-colors",
                      isInitialized
                        ? "bg-white/30 text-white"
                        : "bg-white text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    {isInitialized ? t("✓ Loaded", "✓ Waa la soo raray") : t("Load Data", "Soo rar xogta")}
                  </button>
                </div>
              </div>

              {/* Section Content */}
              {isInitialized && (
                <div className="p-6">
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-4 py-3 text-left font-bold text-gray-700">
                            {t("Category", "Qaybta")}
                          </th>
                          {Object.values(LIVESTOCK_COLUMNS).map((col) => (
                            <th
                              key={col.key}
                              className="px-4 py-3 text-center font-bold text-gray-700"
                            >
                              {lang === "so" ? col.somali : col.english}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {lang === "so" ? row.label : row.labelEn}
                            </td>
                            {Object.keys(LIVESTOCK_COLUMNS).map((columnKey) => {
                              const colKey = columnKey as LivestockColumnKey;
                              const currentValue =
                                sectionData[section.id]?.rows?.[rowIndex]?.[colKey] ||
                                row[colKey] ||
                                "";
                              const isEditing =
                                editingCell?.sectionId === section.id &&
                                editingCell?.rowIndex === rowIndex &&
                                editingCell?.columnKey === colKey;

                              return (
                                <td key={colKey} className="px-4 py-3 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="flex-1 rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                      />
                                      <button
                                        onClick={handleSaveCell}
                                        className="rounded bg-emerald-500 p-1 text-white hover:bg-emerald-600"
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingCell(null)}
                                        className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleCellClick(section.id, rowIndex, colKey)}
                                      className="w-full rounded px-3 py-2 text-left font-mono text-sm transition-colors hover:bg-blue-100 hover:text-blue-900"
                                    >
                                      {currentValue || "—"}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      {Object.keys(sectionData).length > 0 && (
        <div className="flex justify-center gap-3">
          <AdminSaveButton
            label={t("Save All Prices", "Kaydi dhammaan qiimaha")}
            savingLabel={t("Saving…", "Waa la kaydinayaa…")}
            savedLabel={t("Saved successfully", "Si guul leh ayaa loo kaydiyay")}
            saving={saving}
            fullWidth
            onClick={handleSaveAll}
          />
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>{t("Tip:", "Talo:")}</strong>{" "}
          {t(
            "Click on any price cell to edit it. Changes stay in the section until you click Save All Prices.",
            "Taabo qayb kasta oo qiimo ah si aad u beddesho. Isbeddelku wuxuu ku sii jiraa qaybta ilaa aad taabato Kaydi dhammaan qiimaha."
          )}
        </p>
      </div>
    </div>
  );
}
