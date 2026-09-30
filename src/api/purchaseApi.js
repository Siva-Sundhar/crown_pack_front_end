import api from './api.js';

const buildMultipartData = ({ voucherData, attachments = [] }) => {
	const multipartData = new FormData();

	multipartData.append(
		'voucherData',
		new Blob([JSON.stringify(voucherData)], { type: 'application/json' }),
	);

	attachments.forEach((attachment) => {
		const file = attachment?.file ?? attachment;

		if (file instanceof File) {
			multipartData.append('attachment', file, file.name);
		}
	});

	return multipartData;
};

export const createPurchase = async (voucherData, attachments = []) => {
	const multipartData = buildMultipartData({
		voucherData,
		attachments,
	});
	for (const [key, value] of multipartData.entries()) {
		console.log(key, value);
	}
	const response = await api.post(
		'/api/auth/webrequest/purchase',
		multipartData,
	);
	console.log('Saved response', response);
	return response.data;
};

export const getPurchases = async (supplier) => {


	const response = await api.post('/api/auth/purchase/daybook/request', supplier);


    console.log(response);
    
	return response.data;
};

export const getPurchaseById = async (id) => {
	const response = await api.get(`/api/purchases/${id}`);

	return response.data;
};

export const updatePurchase = async ({ id, voucherData, attachments = [] }) => {
	const multipartData = buildMultipartData({
		voucherData,
		attachments,
	});

	const response = await api.put(`/api/purchases/${id}`, multipartData);

	return response.data;
};

export const deletePurchase = async (id) => {
	const response = await api.delete(`/api/purchases/${id}`);

	return response.data;
};
