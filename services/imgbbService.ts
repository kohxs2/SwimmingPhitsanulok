const IMGBB_API_KEY = "6354bef713527df28ebbd83f73de1fbb";

export const uploadImageToImgbb = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || "Failed to upload image");
    }
  } catch (error) {
    console.error("Imgbb Upload Error:", error);
    throw error;
  }
};