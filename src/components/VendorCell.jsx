// src/components/VendorCell.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Icons } from './Icons'

export function VendorCell({ currentVendor, allVendors, onSelect, onAddVendor }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSaveNew = () => {
    const trimmed = newVendorName.trim()
    if (!trimmed || allVendors.some((v) => v.name === trimmed)) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }

    onAddVendor(trimmed)
    setSaveStatus('success')
    setTimeout(() => {
      setSaveStatus('idle')
      setShowModal(false)
      setNewVendorName('')
      setIsOpen(false)
    }, 1000)
  }

  const renderVendorName = (v) => {
    if (typeof v === 'string') return v
    if (typeof v === 'object' && v.name) return v.name
    return 'Unknown Vendor'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen((open) => !open)}
        className="cursor-pointer px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:border-indigo-500 shadow-sm"
      >
        {currentVendor || <span className="text-gray-400 italic">Select Vendor</span>}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
          <div className="max-h-40 overflow-y-auto">
            {allVendors.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  onSelect(renderVendorName(v))
                  setIsOpen(false)
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
              >
                {renderVendorName(v)}
              </div>
            ))}
          </div>
          <div
            onClick={() => {
              setShowModal(true)
              setIsOpen(false)
            }}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 text-sm font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-1 border-t border-gray-200 dark:border-gray-600"
          >
            <Icons.Plus size={14} /> Add New Vendor
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Vendor</h3>
            <input
              type="text"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="Vendor Name"
              className="w-full border rounded p-2 mb-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            />

            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {saveStatus === 'error' && (
                  <span className="text-red-500 text-sm flex items-center gap-1">
                    <Icons.XCircle size={16} /> Error
                  </span>
                )}
                {saveStatus === 'success' && (
                  <span className="text-green-500 text-sm flex items-center gap-1 animate-bounce-short">
                    <Icons.Check size={16} /> Saved
                  </span>
                )}

                <button
                  onClick={handleSaveNew}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
