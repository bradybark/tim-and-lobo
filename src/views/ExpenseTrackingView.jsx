// src/views/ExpenseTrackingView.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, FileText, Tag, DollarSign, Filter, BarChart2 } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { toast } from 'sonner';

export default function ExpenseTrackingView({ expenses, setExpenses, expenseCategories, setExpenseCategories }) {
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'report'

    // -- LIST VIEW STATE --
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    // -- REPORT VIEW STATE --
    const [reportStartDate, setReportStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Table Data
    const { processedData, handleSort, sortConfig, filters, handleFilter } = useTable(expenses, { key: 'date', direction: 'desc' });

    const handleSaveExpense = (newEx) => {
        if (editingExpense) {
            setExpenses(prev => prev.map(e => e.id === newEx.id ? newEx : e));
            toast.success('Expense updated');
        } else {
            setExpenses(prev => [...prev, newEx]);
            toast.success('Expense logged');
        }

        // Add custom category if unique
        if (newEx.category && !expenseCategories.includes(newEx.category)) {
            setExpenseCategories(prev => [...prev, newEx.category].sort());
        }

        setIsModalOpen(false);
        setEditingExpense(null);
    };

    const handleDeleteExpense = (id) => {
        if (confirm('Delete this expense?')) {
            setExpenses(prev => prev.filter(e => e.id !== id));
            toast.error('Expense deleted');
        }
    };

    const handleAddCategory = (cat) => {
        const trimmed = cat.trim();
        if (!trimmed) return;
        if (expenseCategories.includes(trimmed)) {
            toast.error('Category already exists');
            return;
        }
        setExpenseCategories(prev => [...prev, trimmed].sort());
        toast.success('Category added');
    }

    const handleDeleteCategory = (cat) => {
        // prevent deleting if currently in use
        if (expenses.some(e => e.category === cat)) {
            toast.error(`Cannot delete "${cat}"; it is used in existing expenses.`);
            return;
        }
        if (confirm(`Delete category "${cat}"?`)) {
            setExpenseCategories(prev => prev.filter(c => c !== cat));
            toast.success('Category deleted');
        }
    }

    // Formatting helper
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };

    // --- REPORT GENERATION ---
    const reportData = useMemo(() => {
        if (activeTab !== 'report') return null;

        const start = new Date(reportStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(reportEndDate);
        end.setHours(23, 59, 59, 999);

        const validExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d >= start && d <= end;
        });

        let total = 0;
        const categoryTotals = {};

        validExpenses.forEach(ex => {
            const cat = ex.category || 'Uncategorized';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(ex.amount);
            total += Number(ex.amount);
        });

        // convert to array and sort by amount descending
        const summaryList = Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

        return { total, summaryList, expenses: validExpenses };
    }, [expenses, reportStartDate, reportEndDate, activeTab]);


    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-indigo-500" />
                        Expense Tracking
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage and categorize your outgoing business expenses</p>
                </div>
                <div className="flex items-center bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'list' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <FileText className="w-4 h-4" />
                        Expenses List
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'report' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <BarChart2 className="w-4 h-4" />
                        Reports
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'list' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/30">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                Expense Ledger
                            </h2>
                            <button
                                onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm shadow-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Log Expense
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium">
                                    <tr>
                                        <SortableHeaderCell label="Date" sortKey="date" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.date} />
                                        <SortableHeaderCell label="Category" sortKey="category" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.category} />
                                        <SortableHeaderCell label="Description" sortKey="description" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.description} />
                                        <SortableHeaderCell label="Amount" sortKey="amount" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.amount} className="text-right" />
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {processedData.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                No expenses found. Click "Log Expense" to add your first one.
                                            </td>
                                        </tr>
                                    ) : (
                                        processedData.map(exp => (
                                            <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">{exp.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                                        <Tag className="w-3 h-3" />
                                                        {exp.category || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">{exp.description}</td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                                                    {formatMoney(exp.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button onClick={() => { setEditingExpense(exp); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-xs">Edit</button>
                                                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-xs">Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Categories Management Panel */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Manage Categories
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {expenseCategories.map(cat => (
                                <div key={cat} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                    {cat}
                                    <button onClick={() => handleDeleteCategory(cat)} className="ml-1 text-gray-400 hover:text-red-500 rounded-full p-0.5" title="Delete Category">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {expenseCategories.length === 0 && <span className="text-sm text-gray-500">No categories defined.</span>}
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const val = new FormData(e.target).get('newCategory');
                                handleAddCategory(val);
                                e.target.reset();
                            }}
                            className="flex gap-2 max-w-sm"
                        >
                            <input
                                name="newCategory"
                                type="text"
                                placeholder="New Category Name..."
                                className="flex-1 p-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                                required
                            />
                            <button type="submit" className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:opacity-90 transition-opacity">
                                Add
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'report' && reportData && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Filter className="w-4 h-4" /> Date Range Filter:
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={reportStartDate}
                                    onChange={e => setReportStartDate(e.target.value)}
                                    className="p-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={reportEndDate}
                                    onChange={e => setReportEndDate(e.target.value)}
                                    className="p-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Summary Panel */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-indigo-600 dark:bg-indigo-900/50 rounded-xl shadow-lg p-6 text-white border border-transparent dark:border-indigo-800/50">
                                <h3 className="text-indigo-100 text-sm font-medium mb-1">Total Expenses Supported</h3>
                                <div className="text-4xl font-bold tracking-tight mb-2">
                                    {formatMoney(reportData.total)}
                                </div>
                                <p className="text-indigo-200 text-xs">
                                    Across {reportData.expenses.length} transaction(s)
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <BarChart2 className="w-4 h-4" /> Category Breakdown
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {reportData.summaryList.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-gray-500">No data for this period</div>
                                    ) : (
                                        reportData.summaryList.map(item => {
                                            const percent = reportData.total > 0 ? ((item.amount / reportData.total) * 100).toFixed(1) : 0;
                                            return (
                                                <div key={item.category} className="p-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.category}</span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatMoney(item.amount)}</span>
                                                    </div>
                                                    <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="mt-1 text-right text-[10px] text-gray-500 font-medium">
                                                        {percent}%
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detail List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Transactions in Period
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Category</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 p-2">
                                            {reportData.expenses.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="p-8 text-center text-gray-500">No transactions recorded in this date range.</td>
                                                </tr>
                                            ) : (
                                                reportData.expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(exp => (
                                                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-4 py-3 whitespace-nowrap">{exp.date}</td>
                                                        <td className="px-4 py-3"><span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{exp.category || 'Uncategorized'}</span></td>
                                                        <td className="px-4 py-3">{exp.description}</td>
                                                        <td className="px-4 py-3 text-right font-medium">{formatMoney(exp.amount)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )
            }

            {/* Expense Modal */}
            {
                isModalOpen && (
                    <ExpenseModal
                        initialData={editingExpense}
                        categories={expenseCategories}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveExpense}
                    />
                )
            }
        </div >
    );
}

// --- MODAL COMPONENT ---
function ExpenseModal({ initialData, categories, onClose, onSave }) {
    const [formData, setFormData] = useState({
        id: initialData?.id || Date.now(),
        date: initialData?.date || new Date().toISOString().split('T')[0],
        amount: initialData?.amount || '',
        category: initialData?.category || (categories[0] || ''),
        description: initialData?.description || ''
    });

    const [isNewCategory, setIsNewCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || formData.amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        const categoryToSave = isNewCategory ? customCategory.trim() : formData.category;
        if (!categoryToSave) {
            toast.error('Please select or create a category');
            return;
        }

        onSave({
            ...formData,
            amount: Number(formData.amount),
            category: categoryToSave
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {initialData ? 'Edit Expense' : 'Log New Expense'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full pl-10 pr-3 py-2 text-sm border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Amount ($)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full pl-10 pr-3 py-2 text-sm border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Category</label>
                        {!isNewCategory ? (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 text-sm border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20 appearance-none bg-white"
                                    >
                                        <option value="" disabled>Select Category...</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <button type="button" onClick={() => setIsNewCategory(true)} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    + New
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    value={customCategory}
                                    onChange={e => setCustomCategory(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="Enter custom category..."
                                />
                                <button type="button" onClick={() => setIsNewCategory(false)} className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium">
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Description</label>
                        <textarea
                            rows="2"
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/20 resize-none"
                            placeholder="What was this for?"
                        ></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition-colors">
                            {initialData ? 'Update Expense' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
