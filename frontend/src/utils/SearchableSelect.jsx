// src/utils/SearchableSelect.jsx
import { useState, useEffect, useRef } from "react";

export default function SearchableSelect({ options, value, onChange, label, placeholder = "" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    // 点击页面其他地方收起下拉
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedLabel = options.find((opt) => opt.value === value)?.label ?? "";

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="font-bold block mb-1">{label}</label>}

            {/* 下拉显示区域 */}
            <div
                className="rounded-lg px-3 py-2 cursor-pointer flex justify-between items-center bg-white border border-gray-300"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span>{selectedLabel || placeholder}</span>
                <span className="ml-2">&#9662;</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow max-h-60 overflow-auto border border-gray-300">
                    {/* 搜索输入框 */}
                    <input
                        className="w-full px-2 py-1 rounded-lg border border-gray-300 outline-none"
                        type="text"
                        placeholder="搜索..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.value ?? opt.label}
                                className={`px-3 py-2 cursor-pointer hover:bg-blue-100 ${
                                    opt.value === value ? "bg-blue-50 font-semibold" : ""
                                }`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                    setSearch("");
                                }}
                            >
                                {opt.label}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-gray-400 italic">暂无选项</div>
                    )}
                </div>
            )}
        </div>
    );
}
