export const getVoucherNo = async () => {
  const response = await api.get("/api/auth/series/Last");
  return response.data;
}

export const createPurchase = async (voucherData, attachments = []) => {
  const multipartData = buildMultipartData({
    voucherData,
    attachments,
  });
  for (const [key, value] of multipartData.entries()) {
    console.log(key, value);
  }
  const response = await api.post(
    "/api/auth/webrequest/purchase",
    multipartData,
  );
  
  return response.data;
};

export const getPurchases = async (supplier) => {
  const response = await api.post(
    "/api/auth/purchase/daybook/request",
    supplier,
  );
  console.log("Fetched purchases:", response.data);
  return response.data;
};

export const getPurchaseById = async (id) => {
  const response = await api.get(`/api/auth/webrequest/purchase/${id}`, {
    responseType: "blob",
  });

  const contentType = response.headers["content-type"];

  const fd = await new Response(response.data, {
    headers: { "Content-Type": contentType },
  }).formData();

  const voucher = JSON.parse(fd.get("voucher")); // string -> object
  const files = fd.getAll("files");

  console.log("Fetched purchase data:", { voucher, files });

  return { voucher, files };
};


export const deletePurchase = async (id) => {
  const response = await api.delete(`/api/purchases/${id}`);

  return response.data;
};
import api from "./api.js";

const buildMultipartData = ({ voucherData, attachments = [] }) => {
  const multipartData = new FormData();

  multipartData.append(
    "voucherData",
    new Blob([JSON.stringify(voucherData)], { type: "application/json" }),
  );

  attachments.forEach((attachment) => {
    const file = attachment?.file ?? attachment;

    if (file instanceof File) {
      multipartData.append("attachment", file, file.name);
    }
  });

  return multipartData;
};