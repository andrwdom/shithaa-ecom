import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiEdit, FiTrash2, FiPlus, FiSave, FiX } from 'react-icons/fi';

const ShippingRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({
    category: '',
    categoryName: '',
    rules: {
      tamilNadu: new Map([
        ['1', 39],
        ['2', 49],
        ['3', 59],
        ['4', 69],
        ['5', 79],
        ['6', 89],
        ['7+', 99]
      ]),
      otherStates: new Map([
        ['1', 49],
        ['2', 69],
        ['3', 89],
        ['4+', 109]
      ])
    }
  });

  const categories = [
    { value: 'maternity-feeding-wear', label: 'Maternity Feeding Wear' },
    { value: 'zipless-feeding-lounge-wear', label: 'Zipless Feeding Lounge Wear' },
    { value: 'non-feeding-lounge-wear', label: 'Non-Feeding Lounge Wear' },
    { value: 'zipless-feeding-dupatta-lounge-wear', label: 'Zipless Feeding Dupatta Lounge Wear' }
  ];

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://shithaa.in'}/api/shipping-rules`, {
        headers: {
          'token': localStorage.getItem('token')
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRules(data.data || []);
        } else {
          toast.error(data.message || 'Failed to fetch rules');
        }
      } else {
        toast.error('Failed to fetch shipping rules');
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Failed to fetch shipping rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (ruleData) => {
    try {
      const url = editingRule 
        ? `${import.meta.env.VITE_API_URL || 'https://shithaa.in'}/api/shipping-rules/${editingRule.category}`
        : `${import.meta.env.VITE_API_URL || 'https://shithaa.in'}/api/shipping-rules`;
      
      const method = editingRule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'token': localStorage.getItem('token')
        },
        body: JSON.stringify(ruleData)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(editingRule ? 'Rule updated successfully!' : 'Rule created successfully!');
          setEditingRule(null);
          setShowAddForm(false);
          setNewRule({
            category: '',
            categoryName: '',
            rules: {
              tamilNadu: new Map([
                ['1', 39],
                ['2', 49],
                ['3', 59],
                ['4', 69],
                ['5', 79],
                ['6', 89],
                ['7+', 99]
              ]),
              otherStates: new Map([
                ['1', 49],
                ['2', 69],
                ['3', 89],
                ['4+', 109]
              ])
            }
          });
          fetchRules();
        } else {
          toast.error(data.message || 'Failed to save rule');
        }
      } else {
        toast.error('Failed to save shipping rule');
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save shipping rule');
    }
  };

  const handleDeleteRule = async (category) => {
    if (!confirm('Are you sure you want to delete this shipping rule?')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://shithaa.in'}/api/shipping-rules/${category}`, {
        method: 'DELETE',
        headers: {
          'token': localStorage.getItem('token')
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Rule deleted successfully!');
          fetchRules();
        } else {
          toast.error(data.message || 'Failed to delete rule');
        }
      } else {
        toast.error('Failed to delete shipping rule');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete shipping rule');
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setNewRule({
      category: rule.category,
      categoryName: rule.categoryName,
      rules: {
        tamilNadu: new Map(Object.entries(rule.rules.tamilNadu)),
        otherStates: new Map(Object.entries(rule.rules.otherStates))
      }
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setShowAddForm(false);
    setNewRule({
      category: '',
      categoryName: '',
      rules: {
        tamilNadu: new Map([
          ['1', 39],
          ['2', 49],
          ['3', 59],
          ['4', 69],
          ['5', 79],
          ['6', 89],
          ['7+', 99]
        ]),
        otherStates: new Map([
          ['1', 49],
          ['2', 69],
          ['3', 89],
          ['4+', 109]
        ])
      }
    });
  };

  const updateRulePrice = (state, quantity, price) => {
    setNewRule(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [state]: new Map(prev.rules[state]).set(quantity, parseInt(price) || 0)
      }
    }));
  };

  const addQuantityRule = (state) => {
    const quantities = state === 'tamilNadu' ? ['1', '2', '3', '4', '5', '6', '7+'] : ['1', '2', '3', '4+'];
    const newQuantity = prompt('Enter quantity (e.g., 8, 9, 10+):');
    if (newQuantity && !quantities.includes(newQuantity)) {
      setNewRule(prev => ({
        ...prev,
        rules: {
          ...prev.rules,
          [state]: new Map(prev.rules[state]).set(newQuantity, 0)
        }
      }));
    }
  };

  const removeQuantityRule = (state, quantity) => {
    if (state === 'tamilNadu' && ['1', '2', '3', '4', '5', '6', '7+'].includes(quantity)) return;
    if (state === 'otherStates' && ['1', '2', '3', '4+'].includes(quantity)) return;
    
    setNewRule(prev => {
      const newRules = new Map(prev.rules[state]);
      newRules.delete(quantity);
      return {
        ...prev,
        rules: {
          ...prev.rules,
          [state]: newRules
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-[rgb(71,60,102)] mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Loading shipping rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shipping Rules Management</h1>
          <p className="mt-2 text-gray-600">Configure shipping costs for different categories and states</p>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRule ? 'Edit Shipping Rule' : 'Add New Shipping Rule'}
              </h2>
              <button
                onClick={handleCancelEdit}
                className="btn btn-sm btn-outline"
              >
                <FiX className="mr-2" />
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule(prev => ({ ...prev, category: e.target.value }))}
                    className="select select-bordered w-full"
                    disabled={!!editingRule}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Display Name
                  </label>
                  <input
                    type="text"
                    value={newRule.categoryName}
                    onChange={(e) => setNewRule(prev => ({ ...prev, categoryName: e.target.value }))}
                    className="input input-bordered w-full"
                    placeholder="e.g., Maternity Feeding Wear"
                  />
                </div>
              </div>

              {/* Rules Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Shipping Rules</h3>
                  <button
                    onClick={() => handleSaveRule(newRule)}
                    className="btn btn-primary btn-sm"
                    disabled={!newRule.category || !newRule.categoryName}
                  >
                    <FiSave className="mr-2" />
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </button>
                </div>

                {/* Tamil Nadu Rules */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Tamil Nadu</h4>
                    <button
                      onClick={() => addQuantityRule('tamilNadu')}
                      className="btn btn-xs btn-outline"
                    >
                      <FiPlus className="mr-1" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Array.from(newRule.rules.tamilNadu.entries()).map(([quantity, price]) => (
                      <div key={quantity} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 w-12">{quantity}:</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => updateRulePrice('tamilNadu', quantity, e.target.value)}
                          className="input input-bordered input-sm w-20"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500">₹</span>
                        <button
                          onClick={() => removeQuantityRule('tamilNadu', quantity)}
                          className="btn btn-xs btn-ghost text-red-500 hover:text-red-700"
                          disabled={['1', '2', '3', '4', '5', '6', '7+'].includes(quantity)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other States Rules */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Other States</h4>
                    <button
                      onClick={() => addQuantityRule('otherStates')}
                      className="btn btn-xs btn-outline"
                    >
                      <FiPlus className="mr-1" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Array.from(newRule.rules.otherStates.entries()).map(([quantity, price]) => (
                      <div key={quantity} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 w-12">{quantity}:</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => updateRulePrice('otherStates', quantity, e.target.value)}
                          className="input input-bordered input-sm w-20"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500">₹</span>
                        <button
                          onClick={() => removeQuantityRule('otherStates', quantity)}
                          className="btn btn-xs btn-ghost text-red-500 hover:text-red-700"
                          disabled={['1', '2', '3', '4+'].includes(quantity)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Current Shipping Rules</h2>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-primary btn-sm"
                >
                  <FiPlus className="mr-2" />
                  Add New Rule
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamil Nadu Rules
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Other States Rules
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <FiPlus className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No shipping rules configured</p>
                        <p className="text-gray-500">Get started by creating your first shipping rule</p>
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="btn btn-primary mt-4"
                        >
                          <FiPlus className="mr-2" />
                          Add First Rule
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.category} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rule.categoryName}</div>
                          <div className="text-sm text-gray-500">{rule.category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {Object.entries(rule.rules.tamilNadu).map(([qty, price]) => (
                            <div key={qty} className="flex items-center gap-2">
                              <span className="font-medium">{qty}:</span>
                              <span>₹{price}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {Object.entries(rule.rules.otherStates).map(([qty, price]) => (
                            <div key={qty} className="flex items-center gap-2">
                              <span className="font-medium">{qty}:</span>
                              <span>₹{price}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          rule.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="btn btn-sm btn-outline"
                          >
                            <FiEdit className="mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.category)}
                            className="btn btn-sm btn-outline btn-error"
                          >
                            <FiTrash2 className="mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingRules; 