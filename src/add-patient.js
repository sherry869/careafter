import { apiPost, requireSession } from './supabaseClient.js';

let session = null;
async function initSession() {
  session = await requireSession();
}
initSession();

const dropzone = document.getElementById('dropzone');
const dropzonePrompt = document.getElementById('dropzonePrompt');
const imageInput = document.getElementById('imageInput');
const browseBtn = document.getElementById('browseBtn');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImgBtn = document.getElementById('removeImgBtn');
const patientForm = document.getElementById('patientForm');
const submitBtn = document.getElementById('submitBtn');
const loadingState = document.getElementById('loadingState');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');
const successBox = document.getElementById('successBox');

let currentBase64Image = null;
let currentMimeType = 'image/jpeg';

browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  imageInput.click();
});

dropzone.addEventListener('click', () => {
  if (!currentBase64Image) imageInput.click();
});

imageInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleFile(file);
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
  });
});

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
});

removeImgBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currentBase64Image = null;
  imageInput.value = '';
  imagePreview.src = '';
  previewContainer.classList.add('hidden');
  dropzonePrompt.classList.remove('hidden');
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) return;
  currentMimeType = file.type;
  const reader = new FileReader();
  reader.onload = (e) => {
    currentBase64Image = e.target.result;
    imagePreview.src = currentBase64Image;
    dropzonePrompt.classList.add('hidden');
    previewContainer.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function showError(msg) {
  successBox.classList.add('hidden');
  errorMessage.textContent = msg;
  errorBox.classList.remove('hidden');
}

patientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');
  successBox.classList.add('hidden');

  const risks = [...document.querySelectorAll('input[name="risk"]:checked')].map((el) => el.value);
  const other = document.getElementById('riskOther').value.trim();
  if (other) risks.push(other);

  loadingState.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const contactEmail = document.getElementById('whatsapp').value.trim();
    const data = await apiPost(
      '/api/add-patient',
      {
        name: document.getElementById('patientName').value.trim(),
        email: contactEmail,
        whatsapp_number: contactEmail,
        diagnosis: document.getElementById('diagnosis').value.trim(),
        risk_factors: risks,
        image: currentBase64Image,
        mimeType: currentMimeType
      },
      session.access_token
    );

    const medCount = Array.isArray(data.patient?.medicines) ? data.patient.medicines.length : 0;
    successBox.textContent =
      (data.message || 'Patient added. Check-ins will begin automatically.') +
      (medCount ? ` ${medCount} medicine(s) saved from the prescription scan.` : '');
    successBox.classList.remove('hidden');
    patientForm.reset();
    currentBase64Image = null;
    imagePreview.src = '';
    previewContainer.classList.add('hidden');
    dropzonePrompt.classList.remove('hidden');
  } catch (err) {
    showError(err.message || 'Failed to add patient.');
  } finally {
    loadingState.classList.add('hidden');
    submitBtn.disabled = false;
  }
});
