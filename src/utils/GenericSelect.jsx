import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

const GenericSelect = forwardRef(function GenericSelect(
  {
    options = [],
    value = null,
    onChange,
    labelKey = "label",
    valueKey = "value",
    placeholder = "Select...",
    onSelect,
    disabled = false,
    title,
    onCreate,
    containerStyle = {},
    controlStyle = {},
    inputStyle = {},
    menuStyle = {},
    optionStyle = {},
    inputFocusStyle = {},
    ...restProps
  },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Expose focus/blur methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      openMenu();
      inputRef.current?.focus({ preventScroll: true });
    },
    blur: () => inputRef.current?.blur(),
    input: inputRef.current,
  }));

  const getOptionLabel = (option) => {
    if (!option) return "";
    if (typeof option === "string" || typeof option === "number")
      return String(option);
    return String(option[labelKey] ?? option.label ?? "");
  };

  const getOptionValue = (option) => {
    if (option === null || option === undefined) return "";
    if (typeof option === "string" || typeof option === "number") return option;
    return option[valueKey] ?? option.value ?? "";
  };

  // Keep input text synced with selected value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value ? getOptionLabel(value) : "");
    }
  }, [value, labelKey, isOpen]);

  // Scroll focused option into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const focusedEl = listRef.current.querySelector('[data-focused="true"]');
    if (focusedEl) {
      focusedEl.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [focusedIndex, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm(value ? getOptionLabel(value) : "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Filter options ONLY if the user typed while open
  const filteredOptions = options.filter((option) => {
    // If closed or search term is empty, show all options
    if (!isOpen || !searchTerm.trim()) return true;

    // If the search term is identical to the current value, show all options
    if (value && searchTerm === getOptionLabel(value)) return true;

    return getOptionLabel(option)
      .toLowerCase()
      .includes(searchTerm.toLowerCase().trim());
  });

  const openMenu = () => {
    // Keep search term matching the current value, but show all options
    const currentLabel = value ? getOptionLabel(value) : "";
    setSearchTerm(currentLabel);

    if (options.length === 0) {
      setFocusedIndex(-1);
    } else {
      const selectedIndex = options.findIndex(
        (option) =>
          String(getOptionValue(option)) === String(getOptionValue(value)),
      );
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }

    setIsOpen(true);

    setTimeout(() => {
      inputRef.current?.select?.();
    }, 0);
  };

  const handleSelect = (option) => {
    onChange?.(option);
    setSearchTerm(getOptionLabel(option));
    setIsOpen(false);
    setFocusedIndex(0);
    onSelect?.(option);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    const hasOptions = filteredOptions.length > 0;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        if (!hasOptions) {
          setFocusedIndex(-1);
          return;
        }
        setFocusedIndex((prev) => {
          if (prev === -1) return 0;
          return Math.min(prev + 1, filteredOptions.length - 1);
        });
        break;
      }

      case "ArrowUp": {
        e.preventDefault();
        if (!hasOptions) {
          setFocusedIndex(-1);
          return;
        }
        setFocusedIndex((prev) => {
          if (prev === 0) return -1;
          if (prev > 0) return prev - 1;
          return -1;
        });
        break;
      }

      case "Enter": {
        e.preventDefault();
        if (focusedIndex === -1) {
          onCreate?.(title);
          setIsOpen(false);
          setSearchTerm(value ? getOptionLabel(value) : "");
          return;
        }

        const selectedOption = filteredOptions[focusedIndex];
        if (selectedOption) {
          handleSelect(selectedOption);
        }
        break;
      }

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm(value ? getOptionLabel(value) : "");
        setFocusedIndex(0);
        break;

      default:
        break;
    }
  };

  const defaultContainerStyle = {
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? "none" : "auto",
  };

  const defaultControlStyle = {
    display: "flex",
    alignItems: "center",
    cursor: "text",
  };

  const defaultInputStyle = {
    width: "100%",
    padding: "0 3px",
    outline: "none",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    color: "#1d293d",
    backgroundColor: "transparent",
  };

  const defaultMenuStyle = {
    position: "fixed",
    top: "4px",
    right: "4px",
    bottom: "39px",
    width: "280px",
    overflowY: "auto",
    backgroundColor: "#def1fc",
    border: "1px solid #45556c",
    zIndex: 100,
    padding: 0,
    listStyle: "none",
    boxSizing: "border-box",
  };

  const defaultListStyle = {
    padding: "1px 0 0 12px",
    cursor: "pointer",
    fontSize: "12px",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #aacc",
    transition: "background-color 0.15s ease",
  };

  const defaultInputFocusStyle = {
    color: "#020617",
  };

  return (
    <div
      ref={containerRef}
      style={{
        ...defaultContainerStyle,
        ...containerStyle,
      }}
      {...restProps}
    >
      <div
        style={{
          ...defaultControlStyle,
          ...controlStyle,
        }}
        onClick={() => {
          openMenu();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            const query = e.target.value;
            setSearchTerm(query);
            setIsOpen(true);

            const matched = options.filter((option) =>
              getOptionLabel(option)
                .toLowerCase()
                .includes(query.toLowerCase().trim()),
            );

            setFocusedIndex(matched.length > 0 ? 0 : -1);
          }}
          onFocus={openMenu}
          onKeyDown={handleKeyDown}
          style={{
            ...defaultInputStyle,
            ...inputStyle,
            ...(isOpen
              ? { ...defaultInputFocusStyle, ...inputFocusStyle }
              : {}),
          }}
        />
      </div>

      {isOpen && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ul
            ref={listRef}
            style={{
              ...defaultMenuStyle,
              ...menuStyle,
            }}
          >
            {/* Header + Create button */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderBottom: "1px dashed #ccc",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <h1 className="bg-[#2a67b1] text-white pl-2 text-[13px] text-left font-semibold">
                List of {title}
              </h1>
              {/* <div className="w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onCreate?.(title);
                  }}
                  className="w-full text-right text-[13px] pr-2 mt-2 border-slate-500 cursor-pointer"
                  data-focused={focusedIndex === -1}
                  style={{
                    backgroundColor:
                      focusedIndex === -1 ? '#fef08a' : 'transparent',
                  }}
                >
                  Create
                </button>
              </div> */}
            </div>

            {/* Options list */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const label = getOptionLabel(option);
                const key = getOptionValue(option) || index;

                const isSelected =
                  value !== null &&
                  value !== undefined &&
                  String(getOptionValue(option)) ===
                    String(getOptionValue(value));

                const isFocused = index === focusedIndex;

                return (
                  <li
                    key={key}
                    data-focused={isFocused}
                    onClick={() => handleSelect(option)}
                    style={{
                      backgroundColor: isSelected
                        ? "#bfdbfe"
                        : isFocused
                          ? "#fef08a"
                          : "transparent",
                      fontWeight: isSelected ? "600" : "normal",
                      color: isSelected ? "#075985" : "#334155",
                      ...defaultListStyle,
                      ...optionStyle,
                    }}
                  >
                    {label}
                  </li>
                );
              })
            ) : (
              <li
                style={{
                  padding: "12px",
                  color: "#94a3b8",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                No results found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
});

export default GenericSelect;
