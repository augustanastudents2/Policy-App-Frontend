// Handle form submission for creating/updating a bylaw
document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("bylawForm");
    if (!form) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        // Not logged in, redirect to login page
        alert("Please login to create a bylaw.");
        window.location.href = "admin/login.html";
        return;
    }

    // Initialize Quill editor
    const quillEditor = new Quill('#bylawContent', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'blockquote', 'code-block'],
                ['clean']
            ]
        },
        placeholder: 'Enter bylaw content...'
    });

    // Check if we're in edit mode (ID in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const bylawId = urlParams.get('id');
    let isEditMode = false;

    if (bylawId) {
        // Edit mode - load existing bylaw data
        isEditMode = true;
        try {
            const response = await fetch(
                `https://asa-policy-backend.onrender.com/api/bylaws`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load bylaw data");
            }

            const bylaws = await response.json();
            const bylaw = bylaws.find(b => b.id === bylawId);

            if (!bylaw) {
                alert("Bylaw not found");
                window.location.href = "bylaw.html";
                return;
            }

            // Pre-populate form fields
            document.getElementById("bylawNumber").value = bylaw.bylaw_number || '';
            document.getElementById("bylawTitle").value = bylaw.bylaw_title || '';
            // Set content in Quill editor
            if (bylaw.bylaw_content) {
                quillEditor.root.innerHTML = bylaw.bylaw_content;
            }

            // Update form title and submit button
            const formTitle = document.getElementById("formTitle");
            if (formTitle) {
                formTitle.textContent = "Update Bylaw";
            }
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = "Update Bylaw";
            }

            // Disable bylaw number field in edit mode (it shouldn't be changed)
            document.getElementById("bylawNumber").disabled = true;
        } catch (err) {
            console.error("Error loading bylaw:", err);
            alert("Failed to load bylaw data. Redirecting...");
            window.location.href = "bylaw.html";
            return;
        }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const bylawNumberInput = document.getElementById("bylawNumber").value.trim();
        const bylawTitle = document.getElementById("bylawTitle").value.trim();
        // Get HTML content from Quill editor
        const bylawContent = quillEditor.root.innerHTML.trim();

        // Validate required fields
        if (!bylawNumberInput) {
            alert("Please enter a Bylaw Number");
            return;
        }
        const bylawNumber = parseInt(bylawNumberInput);
        if (isNaN(bylawNumber)) {
            alert("Bylaw Number must be a valid number");
            return;
        }
        if (!bylawTitle) {
            alert("Please enter a Bylaw Title");
            return;
        }
        if (!bylawContent) {
            alert("Please enter Bylaw Content");
            return;
        }

        console.log("Bylaw Number:", bylawNumber);
        console.log("Bylaw Title:", bylawTitle);
        console.log("Bylaw Content:", bylawContent);

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };

    try {
        let response;
        if (isEditMode && bylawId) {
            // Update existing bylaw (use UUID)
            response = await fetch(
                `https://asa-policy-backend.onrender.com/api/bylaws/${bylawId}`,
                {
                    method: "PUT",
                    headers: headers,
                    body: JSON.stringify({
                        bylaw_title: bylawTitle,
                        bylaw_content: bylawContent
                    })
                }
            );
        } else {
            // Create new bylaw
            response = await fetch(
                "https://asa-policy-backend.onrender.com/api/bylaws",
                {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        bylaw_number: bylawNumber,
                        bylaw_title: bylawTitle,
                        bylaw_content: bylawContent,
                        status: "draft"
                    })
                }
            );
        }

        if (!response.ok) {
            // Try to get the error message from the response
            let errorMessage = isEditMode ? "Failed to update bylaw. Please try again." : "Failed to create bylaw. Please try again.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = `${isEditMode ? 'Failed to update' : 'Failed to create'} bylaw: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        const data = await response.json();
        console.log(isEditMode ? "Bylaw updated:" : "Bylaw created:", data.bylaw_title);

        alert(isEditMode ? "Bylaw updated successfully" : "Bylaw created successfully");
        
        // Redirect back to bylaws page
        window.location.href = "bylaw.html";
    } catch (err) {
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} bylaw:`, err);
        alert(`Failed to ${isEditMode ? 'update' : 'create'} bylaw. Please try again.\n\nError: ` + err.message);
    }
    });
});