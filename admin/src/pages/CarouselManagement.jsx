import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { backendUrl } from '../App';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const CarouselManagement = ({ token }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sectionId: '',
    order: 0
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/carousel`, {
        headers: { token }
      });
      setBanners(response.data);
    } catch (error) {
      toast.error('Failed to fetch banners');
      console.error('Error fetching banners:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('sectionId', formData.sectionId);
      formDataToSend.append('order', formData.order);
      
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
        sectionId: '',
        order: 0
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
      sectionId: banner.sectionId || '',
      order: banner.order
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Carousel Banner Management</h1>
      
      {/* Create/Edit Banner Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingBanner ? 'Edit Banner' : 'Create New Banner'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Section ID (Optional)</label>
            <input
              type="text"
              value={formData.sectionId}
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g., best-seller-section"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Banner Image</label>
            <input
              type="file"
              onChange={(e) => setSelectedImage(e.target.files[0])}
              className="mt-1 block w-full"
              accept="image/*"
              required={!editingBanner}
            />
            {editingBanner && !selectedImage && (
              <img
                src={editingBanner.image}
                alt="Current banner"
                className="mt-2 h-32 object-cover rounded"
              />
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
          </button>
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
                {banners.map((banner, index) => (
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
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-32 h-20">
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{banner.title}</h3>
                          <p className="text-sm text-gray-600">{banner.description}</p>
                          {banner.sectionId && (
                            <p className="text-xs text-gray-500">
                              Section: {banner.sectionId}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(banner._id)}
                            className="text-red-600 hover:text-red-900"
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
      </div>
    </div>
  );
};

export default CarouselManagement; 