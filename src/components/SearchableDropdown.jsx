import { useState, useEffect, useRef } from 'react';

/**
 * SearchableDropdown - A searchable single-select dropdown with professional styling
 * Mobile responsive version
 */
export default function SearchableDropdown({
    items = [],
    selectedItem = "",
    onChange,
    onBlur,
    label = "Select Item",
    placeholder = "Start typing...",
    showLabel = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Handle resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter items based on search text
    const filteredItems = items.filter(item =>
        item.toLowerCase().includes(searchText.toLowerCase())
    );

    // Calculate dropdown position when opening
    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchText("");
            }
        }

        function handleScroll() {
            if (isOpen) {
                updateDropdownPosition();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleSelectItem = (item) => {
        onChange(item);
        setIsOpen(false);
        setSearchText("");
    };

    const handleInputClick = () => {
        updateDropdownPosition();
        setIsOpen(true);
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchText(value);
        onChange(value);
        if (!isOpen) {
            updateDropdownPosition();
        }
        setIsOpen(true);
    };

    const handleInputBlur = () => {
        if (onBlur) {
            onBlur();
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsOpen(false);
            setSearchText("");
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchText("");
        }
    };

    const getDisplayValue = () => {
        if (isOpen) {
            return searchText || selectedItem;
        }
        return selectedItem || "";
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            {showLabel && (
                <label style={{
                    display: "block",
                    marginBottom: 6,
                    fontWeight: 600,
                    color: "#374151",
                    fontSize: 13
                }}>
                    {label}
                </label>
            )}

            <input
                ref={inputRef}
                type="text"
                value={getDisplayValue()}
                onChange={handleInputChange}
                onClick={handleInputClick}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    background: "#fff",
                    outline: "none",
                    cursor: "text"
                }}
            />

            {/* Dropdown Menu */}
            {isOpen && filteredItems.length > 0 && (
                <div style={isMobile ? {
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    width: '100%',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 9999,
                    maxHeight: 200,
                    overflowY: 'auto',
                    marginTop: 4
                } : {
                    position: 'fixed',
                    top: dropdownPosition.top + 4,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 9999,
                    maxHeight: 250,
                    overflowY: 'auto'
                }}>
                    {filteredItems.map((item) => (
                        <div
                            key={item}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectItem(item);
                            }}
                            style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                background: selectedItem === item ? '#eff6ff' : 'transparent',
                                fontSize: 14,
                                color: '#1f2937',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedItem !== item) {
                                    e.currentTarget.style.background = '#f9fafb';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedItem !== item) {
                                    e.currentTarget.style.background = 'transparent';
                                } else {
                                    e.currentTarget.style.background = '#eff6ff';
                                }
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            )}

            {/* No Results Message */}
            {isOpen && searchText && filteredItems.length === 0 && (
                <div style={isMobile ? {
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    width: '100%',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 9999,
                    padding: '10px 14px',
                    fontSize: 14,
                    color: '#6b7280',
                    textAlign: 'center',
                    marginTop: 4
                } : {
                    position: 'fixed',
                    top: dropdownPosition.top + 4,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 9999,
                    padding: '10px 14px',
                    fontSize: 14,
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    No items found
                </div>
            )}
        </div>
    );
}
