
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PropertyForm.css";
import api from "../api/axios";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 10;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
];

const INITIAL_FORM_DATA = {
  title: "",
  description: "",
  propertyType: "house",
  listingType: "sale",
  price: "",
  location: "",
  area: "",
  areaUnit: "aana",
  bedrooms: "",
  bathrooms: "",
};

function PropertyForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);

  const [lalpurja, setLalpurja] = useState(null);
  const [existingLalpurja, setExistingLalpurja] = useState(null);

  // Load existing property when editing
  useEffect(() => {
    if (!isEditMode) return;

    const fetchProperty = async () => {
      try {
        const response = await api.get(`/api/properties/${id}`);

        const property =
          response.data.property || response.data;

        setFormData({
          title: property.title || "",
          description: property.description || "",
          propertyType: property.propertyType || "house",
          listingType: property.listingType || "sale",
          price: property.price ?? "",
          location: property.location || "",
          area: property.area ?? "",
          areaUnit: property.areaUnit || "aana",
          bedrooms: property.bedrooms ?? "",
          bathrooms: property.bathrooms ?? "",
        });

        setExistingImages(property.images || []);
        setExistingLalpurja(property.lalpurja || null);
      } catch (error) {
        setMessage(
          error.response?.data?.message ||
            "Unable to load property details."
        );
        setMessageType("error");
      } finally {
        setFetching(false);
      }
    };

    fetchProperty();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate new property images
  const handleImageChange = (e) => {
    const selectedImages = Array.from(e.target.files);

    const remainingExistingImages = existingImages.length;

    const totalImages =
      remainingExistingImages + images.length + selectedImages.length;

    if (totalImages > MAX_IMAGES) {
      setMessage("You can have a maximum of 10 property images.");
      setMessageType("error");
      e.target.value = "";
      return;
    }

    const invalidImage = selectedImages.find(
      (image) =>
        !ALLOWED_IMAGE_TYPES.includes(image.type) ||
        image.size > MAX_IMAGE_SIZE
    );

    if (invalidImage) {
      setMessage(
        "Images must be JPEG, PNG, or WEBP and each must be 5 MB or smaller."
      );
      setMessageType("error");
      e.target.value = "";
      return;
    }

    setImages((prev) => [...prev, ...selectedImages]);
    setMessage("");
    setMessageType("");
    e.target.value = "";
  };

  // Remove an existing image
  const handleRemoveExistingImage = (publicId) => {
    setRemovedImageIds((prev) => [...prev, publicId]);

    setExistingImages((prev) =>
      prev.filter((image) => image.publicId !== publicId)
    );
  };

  // Remove a newly selected image
  const handleRemoveNewImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Validate Lalpurja document
  const handleLalpurjaChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setLalpurja(null);
      return;
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setMessage("Lalpurja must be an image or PDF file.");
      setMessageType("error");
      e.target.value = "";
      setLalpurja(null);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage("Lalpurja document must not exceed 5 MB.");
      setMessageType("error");
      e.target.value = "";
      setLalpurja(null);
      return;
    }

    setLalpurja(file);
    setMessage("");
    setMessageType("");
  };

  // Submit new or updated property
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setMessage("");
    setMessageType("");

    if (!isEditMode && !lalpurja) {
      setMessage("Please upload your Lalpurja document.");
      setMessageType("error");
      return;
    }

    const totalImages = existingImages.length + images.length;

    if (totalImages > MAX_IMAGES) {
      setMessage("You can have a maximum of 10 property images.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (
          (key === "bedrooms" || key === "bathrooms") &&
          value === ""
        ) {
          return;
        }

        data.append(key, value);
      });

      // Append newly selected images
      images.forEach((image) => {
        data.append("images", image);
      });

      // Tell backend which existing images to remove
      if (removedImageIds.length > 0) {
        data.append(
          "removeImagePublicIds",
          JSON.stringify(removedImageIds)
        );
      }

      if (isEditMode) {
        // Update the existing property
        await api.patch(`/api/properties/${id}`, data);

        setMessage(
          "Property updated successfully! It is now pending admin review."
        );
      } else {
        // Create a new property
        data.append("lalpurja", lalpurja);

        await api.post("/api/properties", data);

        setMessage("Property submitted successfully!");

        setFormData(INITIAL_FORM_DATA);
        setImages([]);
        setLalpurja(null);
      }

      setMessageType("success");
    } catch (error) {
      console.error("Property Submission Error:", error);

      setMessage(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "submit"} property. Please try again.`
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <p>Loading property details...</p>;
  }

  return (
    <div className="property-form-page">
      <div className="property-form-container">

        <h2>
          {isEditMode ? "Update Property" : "Add New Property"}
        </h2>

        <p>
          {isEditMode
            ? "Edit your existing property details below."
            : "Provide the details of your property below."}
        </p>

        <form onSubmit={handleSubmit}>

          {message && (
            <p
              className={`form-message form-message-${messageType}`}
              role={messageType === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          )}

          <div className="form-group">
            <label>Property Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter property title"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your property"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Property Type</label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
              >
                <option value="house">House</option>
                <option value="land">Land</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="form-group">
              <label>Listing Type</label>
              <select
                name="listingType"
                value={formData.listingType}
                onChange={handleChange}
              >
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Price (NPR)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter price"
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter property location"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Area</label>
              <input
                type="number"
                name="area"
                value={formData.area}
                onChange={handleChange}
                placeholder="Enter area"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Area Unit</label>
              <select
                name="areaUnit"
                value={formData.areaUnit}
                onChange={handleChange}
              >
                <option value="aana">Aana</option>
                <option value="ropani">Ropani</option>
                <option value="sqft">Square Feet</option>
                <option value="sqm">Square Meter</option>
                <option value="dhur">Dhur</option>
                <option value="katha">Katha</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Bedrooms</label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Bathrooms</label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Property Images</label>

            {isEditMode && existingImages.length > 0 && (
              <div>
                <p>Current images:</p>

                {existingImages.map((image) => (
                  <div key={image.publicId}>
                    <img
                      src={image.imageUrl}
                      alt="Existing property"
                      width="120"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveExistingImage(image.publicId)
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
            />

            <small>
              Maximum 10 images in total, 5 MB each.
            </small>

            {images.map((image, index) => (
              <div key={`${image.name}-${index}`}>
                <span>{image.name}</span>

                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>Land Ownership Certificate (Lalpurja)</label>

            {isEditMode && existingLalpurja && (
              <p>
                Existing Lalpurja document is saved.
                It will remain unchanged unless you update it through
                a separately supported backend operation.
              </p>
            )}

            {!isEditMode && (
              <>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleLalpurjaChange}
                  required
                />

                <small>
                  Upload an image or PDF (maximum 5 MB).
                </small>
              </>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading
              ? isEditMode ? "Saving Changes..." : "Submitting..."
              : isEditMode ? "Save Changes" : "Submit Property"}
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={() => navigate("/seller-dashboard")}
              disabled={loading}
            >
              Cancel
            </button>
          )}

        </form>
      </div>
    </div>
  );
}

export default PropertyForm;
