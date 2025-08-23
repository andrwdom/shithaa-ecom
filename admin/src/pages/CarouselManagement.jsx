import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { backendUrl } from '../App';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const CarouselManagement = ({ token }) => {
  const [banners, setBanners] = useState([]); // Ensure it's initialized as an empty array
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    sectionId: '',
    order: 0,
    isActive: true
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      console.log('Fetching banners from:', `${backendUrl}/api/carousel/admin`);
      const response = await axios.get(`${backendUrl}/api/carousel/admin`, {
        headers: { token }
      });
      
      console.log('API Response:', response.data);
      console.log('Response type:', typeof response.data);
      console.log('Is array:', Array.isArray(response.data));
      
      // Ensure we always set an array, even if the response is unexpected
      if (response.data && Array.isArray(response.data)) {
        console.log('Setting banners from response.data (array)');
        setBanners(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        console.log('Setting banners from response.data.data (array)');
        setBanners(response.data.data);
      } else if (response.data && Array.isArray(response.data.banners)) {
        console.log('Setting banners from response.data.banners (array)');
        setBanners(response.data.banners);
      } else {
        console.warn('Unexpected API response format:', response.data);
        setBanners([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to fetch banners');
      setBanners([]); // Ensure we always have an array
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('link', formData.link);
      formDataToSend.append('sectionId', formData.sectionId);
      formDataToSend.append('order', formData.order);
      formDataToSend.append('isActive', formData.isActive);
      
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
        console.log('Image details:', {
          name: selectedImage.name,
          type: selectedImage.type,
          size: selectedImage.size
        });
      } else {
        console.log('No image selected');
      }

      // Log the FormData contents
      for (let pair of formDataToSend.entries()) {
        console.log('FormData entry:', pair[0], pair[1]);
      }

      const config = {
        headers: {
          token,
          'Content-Type': 'multipart/form-data'
        }
      };

      console.log('Making request to:', `${backendUrl}/api/carousel${editingBanner ? `/${editingBanner._id}` : ''}`);
      
      if (editingBanner) {
        const response = await axios.put(
          `${backendUrl}/api/carousel/${editingBanner._id}`,
          formDataToSend,
          config
        );
        console.log('Update response:', response.data);
        toast.success('Banner updated successfully');
      } else {
        const response = await axios.post(
          `${backendUrl}/api/carousel`,
          formDataToSend,
          config
        );
        console.log('Create response:', response.data);
        toast.success('Banner created successfully');
      }

      setFormData({
        title: '',
        description: '',
        link: '',
        sectionId: '',
        order: 0,
        isActive: true
      });
      setSelectedImage(null);
      setEditingBanner(null);
      fetchBanners();
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      toast.error(error.response?.data?.message || 'Failed to save banner');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await axios.delete(`${backendUrl}/api/carousel/${id}`, {
          headers: { token }
        });
        toast.success('Banner deleted successfully');
        fetchBanners();
      } catch (error) {
        toast.error('Failed to delete banner');
        console.error('Error deleting banner:', error);
      }
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      link: banner.link || '',
      sectionId: banner.sectionId || '',
      order: banner.order,
      isActive: banner.isActive !== false
    });
    setSelectedImage(null);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(banners);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBanners(items);

    try {
      const orders = items.map((item, index) => ({
        id: item._id,
        order: index
      }));

      await axios.put(
        `${backendUrl}/api/carousel/order/update`,
        { orders },
        { headers: { token } }
      );
    } catch (error) {
      toast.error('Failed to update banner order');
      console.error('Error updating banner order:', error);
      fetchBanners(); // Revert to original order
    }
  };

  const toggleActiveStatus = async (banner) => {
    try {
      const updatedBanner = { ...banner, isActive: !banner.isActive };
      await axios.put(
        `${backendUrl}/api/carousel/${banner._id}`,
        { isActive: updatedBanner.isActive },
        { headers: { token } }
      );
      toast.success(`Banner ${updatedBanner.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchBanners();
    } catch (error) {
      toast.error('Failed to update banner status');
      console.error('Error updating banner status:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Carousel Banner Management</h1>
      
      {/* Create/Edit Banner Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingBanner ? 'Edit Banner' : 'Create New Banner'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
                placeholder="Enter banner title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Link URL</label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="https://example.com/page"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              rows="3"
              placeholder="Enter banner description"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Section ID</label>
              <input
                type="text"
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., best-seller-section"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Order</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                min="0"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Banner Image {!editingBanner && '*'}
            </label>
            <input
              type="file"
              onChange={(e) => setSelectedImage(e.target.files[0])}
              className="mt-1 block w-full"
              accept="image/*"
              required={!editingBanner}
            />
            {editingBanner && !selectedImage && (
              <div className="mt-2">
                <img
                  src={editingBanner.image}
                  alt="Current banner"
                  className="h-32 object-cover rounded"
                />
                <p className="text-sm text-gray-500 mt-1">Current image (upload new image to replace)</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Recommended size: 1920x800px for optimal display
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
            </button>
            {editingBanner && (
              <button
                type="button"
                onClick={() => {
                  setEditingBanner(null);
                  setFormData({
                    title: '',
                    description: '',
                    link: '',
                    sectionId: '',
                    order: 0,
                    isActive: true
                  });
                  setSelectedImage(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Banners List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Existing Banners</h2>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="banners">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {Array.isArray(banners) && banners.map((banner, index) => (
                  <Draggable
                    key={banner._id}
                    draggableId={banner._id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`flex items-center gap-4 p-4 rounded-lg border ${
                          banner.isActive ? 'bg-gray-50' : 'bg-gray-100 opacity-75'
                        }`}
                      >
                        <div className="w-32 h-20 flex-shrink-0">
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{banner.title}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              banner.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {banner.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1 line-clamp-2">{banner.description}</p>
                          {banner.link && (
                            <p className="text-xs text-blue-600 truncate">
                              Link: {banner.link}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {banner.sectionId && (
                              <span>Section: {banner.sectionId}</span>
                            )}
                            <span>Order: {banner.order}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => toggleActiveStatus(banner)}
                            className={`px-3 py-1 text-xs rounded ${
                              banner.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {banner.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEdit(banner)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(banner._id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        
        {(!Array.isArray(banners) || banners.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>No banners created yet. Create your first banner above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarouselManagement; 