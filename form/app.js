// --- Google Maps API Loader (MOVED HERE) ---
// This code now runs after env.js is loaded, ensuring window.APP_CONFIG exists.
if (window.APP_CONFIG && window.APP_CONFIG.googleApiKey) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${window.APP_CONFIG.googleApiKey}&libraries=places&callback=initAutocomplete`;
    script.async = true;
    document.head.appendChild(script);
} else {
    console.error("Google API Key not found in env.js. Map functionality will be disabled.");
    // Optionally, disable the map-related step or show a message to the user
}

// --- Google Maps Initialization ---
let map, marker, geocoder;
async function initAutocomplete() {
    const addressInput = document.getElementById("project-address");
    if (!addressInput) return;

    const edmonton = { lat: 53.5461, lng: -113.4938 };
    map = new google.maps.Map(document.getElementById("map"), {
        center: edmonton,
        zoom: 11,
        mapId: "RAAVI_MAP_ID",
        mapTypeControl: false
    });

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
    
    geocoder = new google.maps.Geocoder();

    // --- UPDATED TO USE PlaceAutocompleteElement ---
    const autocompleteElement = new PlaceAutocompleteElement();
    // Style the new element to match the form's aesthetic
    autocompleteElement.className = 'glass-input mt-1 block w-full rounded-md shadow-sm h-10';
    
    // Replace the original input with the new web component
    addressInput.replaceWith(autocompleteElement);

    // Create a hidden input to store the address for form submission
    const hiddenAddressInput = document.createElement('input');
    hiddenAddressInput.type = 'hidden';
    hiddenAddressInput.name = 'project-address';
    document.getElementById('intake-form').appendChild(hiddenAddressInput);

    autocompleteElement.addEventListener('gmp-placeselect', (event) => {
        const place = event.place;
        if (place.geometry && place.geometry.location) {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
            placeMarker(place.geometry.location, AdvancedMarkerElement);
            // Update the hidden input's value for the form
            hiddenAddressInput.value = place.formattedAddress;
        }
    });
    // --- END OF UPDATE ---

    map.addListener("click", (e) => {
        placeMarker(e.latLng, AdvancedMarkerElement);
        geocoder.geocode({ location: e.latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                // When clicking the map, update both the UI element and the hidden input
                autocompleteElement.value = results[0].formatted_address;
                hiddenAddressInput.value = results[0].formatted_address;
            }
        });
    });
}
function placeMarker(position, AdvancedMarkerElement) {
    if (marker) { marker.position = null; }
    marker = new AdvancedMarkerElement({ position, map });
}

// --- App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Card and Button Selectors ---
    const welcomeCard = document.getElementById('welcome-card');
    const formCard = document.getElementById('form-card');
    const thankyouCard = document.getElementById('thankyou-card');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const intakeForm = document.getElementById('intake-form');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const notificationContainer = document.getElementById('notification-container');

    // --- UI FEEDBACK HELPERS (NEW) ---
    const startButtonLoading = (button, loadingText = '') => {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    };
    const stopButtonLoading = (button) => {
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
        button.disabled = false;
    };
    const showNotification = (message, isError = false) => {
        notificationContainer.textContent = message;
        notificationContainer.className = `fixed top-5 right-5 z-[101] text-white px-6 py-3 rounded-lg shadow-lg transition-transform transform ${isError ? 'bg-red-500/80' : 'bg-green-500/80'}`;
        setTimeout(() => {
            notificationContainer.className += ' translate-x-[calc(100%+2rem)]';
        }, 3000);
    };

    // --- View Manager ---
    const showCard = (cardToShow) => {
        [welcomeCard, formCard, thankyouCard].forEach(card => card.classList.remove('active'));
        cardToShow.classList.add('active');
    };
    startBtn.addEventListener('click', () => showCard(formCard));
    restartBtn.addEventListener('click', () => {
        intakeForm.reset();
        currentStep = 0;
        updateFormSteps();
        handleFileUpload();
        handleProjectTypeChange();
        resetCustomSelects();
        showCard(welcomeCard);
    });

    // --- Multi-Step Form Logic ---
    const formSteps = [...document.querySelectorAll('.form-step')];
    const progressBar = document.getElementById('progress-bar');
    const formTitle = document.getElementById('form-title');
    let currentStep = 0;
    const titles = ["Your Information", "Project Location", "Services & Plans", "Final Details"];
    const updateFormSteps = () => {
        formTitle.textContent = titles[currentStep];
        progressBar.style.width = `${((currentStep + 1) / formSteps.length) * 100}%`;
        formSteps.forEach((s, index) => s.classList.toggle('active', index === currentStep));
        prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-block';
        nextBtn.textContent = currentStep === formSteps.length - 1 ? 'Submit' : 'Next';
    };

    // --- Validation Logic ---
    const showError = (element, message) => {
        element.classList.add('error');
        if (element.tagName === 'INPUT') { element.placeholder = message; }
        const wrapper = element.closest('.form-group, .custom-select-wrapper');
        const inputElement = wrapper.querySelector('.custom-select, .glass-input, gmp-place-autocomplete');
        if (inputElement) { inputElement.style.borderColor = 'rgba(239, 68, 68, 0.7)'; }
    };
    const clearError = (element) => {
        element.classList.remove('error');
        if (element.tagName === 'INPUT') { element.placeholder = element.dataset.placeholder || ''; }
        const wrapper = element.closest('.form-group, .custom-select-wrapper');
        const inputElement = wrapper.querySelector('.custom-select, .glass-input, gmp-place-autocomplete');
        if (inputElement) { inputElement.style.borderColor = ''; }
    };
    const validateStep = (stepIndex) => {
        let isValid = true;
        const currentStepFields = formSteps[stepIndex].querySelectorAll('[required], .custom-select');
        currentStepFields.forEach(el => clearError(el));
        if (stepIndex === 0) {
            const name = document.getElementById('client-name');
            const company = document.getElementById('client-company');
            const phone = document.getElementById('phone-number');
            const email = document.getElementById('email-address');
            if (!name.value.trim()) { showError(name, 'REQUIRED'); isValid = false; }
            if (!company.value.trim()) { showError(company, 'REQUIRED'); isValid = false; }
            const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
            if (!phone.value.trim()) { showError(phone, 'REQUIRED'); isValid = false; }
            else if (!phone.value.match(phoneRegex)) { showError(phone, 'INVALID FORMAT'); isValid = false; }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email.value.trim()) { showError(email, 'REQUIRED'); isValid = false; }
            else if (!email.value.match(emailRegex)) { showError(email, 'INVALID FORMAT'); isValid = false; }
        }
        if (stepIndex === 1) {
            // The hidden input now holds the value for validation
            const address = document.querySelector('input[name="project-address"]');
            if (!address.value.trim()) { 
                // Show error on the visible autocomplete element
                showError(document.querySelector('gmp-place-autocomplete'), 'REQUIRED'); 
                isValid = false; 
            }
        }
        if (stepIndex === 2) {
            const selectedType = document.querySelector('input[name="project-type"]:checked').value;
            let categoryInput;
            if (selectedType === 'Commercial') { categoryInput = document.querySelector('input[name="commercial-category"]'); }
            else if (selectedType === 'Residential') { categoryInput = document.querySelector('input[name="residential-category"]'); }
            else if (selectedType === 'Rezoning') { categoryInput = document.querySelector('input[name="rezoning-category"]'); }
            if (categoryInput && !categoryInput.value) {
                const customSelectElement = categoryInput.closest('.custom-select-wrapper').querySelector('.custom-select');
                showError(customSelectElement, 'Please select a category.');
                isValid = false;
            }
        }
        return isValid;
    };
    document.querySelectorAll('.glass-input[required]').forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });

    // --- FORM SUBMISSION LOGIC (UPDATED) ---
    nextBtn.addEventListener('click', async () => {
        if (validateStep(currentStep)) {
            if (currentStep < formSteps.length - 1) {
                currentStep++;
                updateFormSteps();
            } else {
                // On the last step, start loading and submit
                startButtonLoading(nextBtn, 'Submitting...');

                const formData = new FormData(intakeForm);
                const data = Object.fromEntries(formData.entries());
                const fileInput = document.getElementById('file-upload');
                const files = [...fileInput.files];
                let uploadedFilePaths = [];

                try {
                    // 1. UPLOAD FILES (if any)
                    if (files.length > 0) {
                        const clientEmail = data['email-address'].replace(/[^a-zA-Z0-9]/g, '_');
                        const timestamp = Date.now();
                        const folderPath = `${clientEmail}_${timestamp}`;

                        const uploadPromises = files.map(file => {
                            const filePath = `${folderPath}/${file.name}`;
                            return _supabase.storage.from('project-files').upload(filePath, file);
                        });

                        const uploadResults = await Promise.all(uploadPromises);

                        uploadResults.forEach(result => {
                            if (result.error) {
                                throw new Error(`File upload failed: ${result.error.message}`);
                            }
                            const { data: { publicUrl } } = _supabase.storage.from('project-files').getPublicUrl(result.data.path);
                            uploadedFilePaths.push(publicUrl);
                        });
                    }

                    // 2. PREPARE PROJECT DATA
                    const projectData = {
                        name: `${data['client-name']}'s Project`,
                        client_name: data['client-name'],
                        client_company: data['client-company'],
                        client_phone: data['phone-number'],
                        client_email: data['email-address'],
                        address: data['project-address'],
                        project_type: data['project-type'],
                        project_category: data['commercial-category'] || data['residential-category'] || data['rezoning-category'],
                        services_required: data['services-required'],
                        possession_date: data['lease-possession-date'] || null,
                        project_area: data['total-project-area'] || null,
                        area_unit: data['area-unit'],
                        other_info: data['other-info'],
                        uploaded_files: uploadedFilePaths.length > 0 ? { files: uploadedFilePaths } : null,
                        status: 'lead'
                    };

                    // 3. INSERT PROJECT DATA INTO THE DATABASE
                    const { error: insertError } = await _supabase.from('projects').insert([projectData]);

                    if (insertError) {
                        throw new Error(`Database insert failed: ${insertError.message}`);
                    }

                    // 4. SHOW SUCCESS
                    showCard(thankyouCard);

                } catch (error) {
                    console.error('Submission Error:', error);
                    showNotification(`Submission failed: ${error.message}`, true);
                } finally {
                    // This block runs whether the try succeeds or fails
                    stopButtonLoading(nextBtn);
                }
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateFormSteps();
        }
    });
    
    // --- File Upload Logic ---
    const fileUpload = document.getElementById('file-upload');
    const fileListContainer = document.getElementById('file-list-container');
    const fileSizeError = document.getElementById('file-size-error');
    const MAX_SIZE = 100 * 1024 * 1024;
    const handleFileUpload = () => {
        const files = [...fileUpload.files];
        let totalSize = 0;
        fileListContainer.innerHTML = ''; 
        if (files.length === 0) {
            fileSizeError.style.display = 'none';
            nextBtn.disabled = false;
            return;
        }
        const fileList = document.createElement('ul');
        fileList.className = 'list-disc list-inside';
        files.forEach(file => {
            totalSize += file.size;
            const listItem = document.createElement('li');
            listItem.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            fileList.appendChild(listItem);
        });
        fileListContainer.appendChild(fileList);
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
        const totalSizeP = document.createElement('p');
        totalSizeP.className = 'font-bold mt-2';
        totalSizeP.textContent = `Total Size: ${totalSizeMB} MB`;
        fileListContainer.appendChild(totalSizeP);
        if (totalSize > MAX_SIZE) {
            fileSizeError.style.display = 'block';
            nextBtn.disabled = true;
        } else {
            fileSizeError.style.display = 'none';
            nextBtn.disabled = false;
        }
    };
    fileUpload.addEventListener('change', handleFileUpload);

    // --- Dynamic Category & Custom Select Logic ---
    const projectTypeRadios = document.querySelectorAll('input[name="project-type"]');
    const commercialCategories = document.getElementById('commercial-categories');
    const residentialCategories = document.getElementById('residential-categories');
    const rezoningCategories = document.getElementById('rezoning-categories');
    const handleProjectTypeChange = () => {
        const selectedType = document.querySelector('input[name="project-type"]:checked').value;
        commercialCategories.classList.add('hidden');
        residentialCategories.classList.add('hidden');
        rezoningCategories.classList.add('hidden');
        if (selectedType === 'Commercial') { commercialCategories.classList.remove('hidden'); }
        else if (selectedType === 'Residential') { residentialCategories.classList.remove('hidden'); }
        else if (selectedType === 'Rezoning') { rezoningCategories.classList.remove('hidden'); }
    };
    projectTypeRadios.forEach(radio => { radio.addEventListener('change', handleProjectTypeChange); });
    const customSelects = document.querySelectorAll('.custom-select-wrapper');
    customSelects.forEach(wrapper => {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const select = wrapper.querySelector('.custom-select');
        const options = wrapper.querySelectorAll('.custom-option');
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        const displaySpan = trigger.querySelector('span');
        trigger.addEventListener('click', (e) => { e.stopPropagation(); closeAllSelects(select); select.classList.toggle('open'); });
        options.forEach(option => {
            option.addEventListener('click', () => {
                hiddenInput.value = option.dataset.value;
                displaySpan.innerHTML = option.innerHTML;
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                clearError(select);
            });
        });
    });
    const closeAllSelects = (exceptThisOne = null) => {
        document.querySelectorAll('.custom-select').forEach(select => {
            if (select !== exceptThisOne) { select.classList.remove('open'); }
        });
    };
    window.addEventListener('click', () => { closeAllSelects(); });
    const resetCustomSelects = () => {
        customSelects.forEach(wrapper => {
            const hiddenInput = wrapper.querySelector('input[type="hidden"]');
            const displaySpan = wrapper.querySelector('.custom-select-trigger span');
            const options = wrapper.querySelectorAll('.custom-option');
            hiddenInput.value = '';
            displaySpan.textContent = '— Please Select —';
            options.forEach(opt => opt.classList.remove('selected'));
            if (hiddenInput.name === 'area-unit') {
                hiddenInput.value = 'sq ft';
                displaySpan.innerHTML = 'ft<sup>2</sup>';
                wrapper.querySelector('.custom-option[data-value="sq ft"]').classList.add('selected');
            }
        });
    };
    
    // --- Date Picker Icon Logic ---
    const datePickerIcon = document.getElementById('date-picker-icon');
    const dateInput = document.getElementById('lease-possession-date');
    datePickerIcon.addEventListener('click', () => {
        try { dateInput.showPicker(); }
        catch (e) { console.error("Browser does not support showPicker()."); }
    });
    
    // --- Initial setup ---
    updateFormSteps(); 
    handleProjectTypeChange();
    // Call the shared theme switcher setup function
    setupThemeSwitcher('theme-switcher', 'formTheme');
});