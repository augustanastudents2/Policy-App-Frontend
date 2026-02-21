// Handle form submission for creating/updating a policy
document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("policyForm");
    if (!form) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        // Not logged in, redirect to login page
        alert("Please login to create a policy.");
        window.location.href = "admin/login.html";
        return;
    }

    // Initialize Quill editor
    const quillEditor = new Quill('#policyContent', {
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
        placeholder: 'Enter policy content...'
    });

    // Check if we're in edit mode (ID in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('id');
    let isEditMode = false;
    let originalPolicyId = null; // Store the original policy_id (TEXT) for updates

    if (policyId) {
        // Edit mode - load existing policy data
        isEditMode = true;
        try {
            const response = await fetch(
                `https://asa-policy-backend.onrender.com/api/policies`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load policy data");
            }

            const policies = await response.json();
            const policy = policies.find(p => p.id === policyId);

            if (!policy) {
                alert("Policy not found");
                window.location.href = "policies.html";
                return;
            }

            // Pre-populate form fields
            document.getElementById("policyId").value = policy.policy_id || '';
            document.getElementById("policyName").value = policy.policy_name || '';
            document.getElementById("section").value = policy.section || '';
            // Set content in Quill editor
            if (policy.policy_content) {
                quillEditor.root.innerHTML = policy.policy_content;
            }

            // Store original policy_id for update
            originalPolicyId = policy.policy_id;

            // Update form title and submit button
            const formTitle = document.getElementById("formTitle");
            if (formTitle) {
                formTitle.textContent = "Update Policy";
            }
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = "Update Policy";
            }

            // Disable policy ID field in edit mode (it shouldn't be changed)
            document.getElementById("policyId").disabled = true;
        } catch (err) {
            console.error("Error loading policy:", err);
            alert("Failed to load policy data. Redirecting...");
            window.location.href = "policies.html";
            return;
        }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        // In edit mode, use the stored originalPolicyId; otherwise get from form
        const policyId = isEditMode ? originalPolicyId : document.getElementById("policyId").value.trim();
        const policyName = document.getElementById("policyName").value.trim();
        const section = document.getElementById("section").value.trim();
        // Get HTML content from Quill editor
        const policyContent = quillEditor.root.innerHTML.trim();

        // Validate required fields (skip policyId check in edit mode since it's disabled)
        if (!isEditMode && !policyId) {
            alert("Please enter a Policy ID");
            return;
        }
        if (!policyName) {
            alert("Please enter a Policy Name");
            return;
        }
        if (!section) {
            alert("Please select a Section");
            return;
        }
        if (!policyContent) {
            alert("Please enter Policy Content");
            return;
        }

        console.log("Policy ID:", policyId);
        console.log("Policy Name:", policyName);
        console.log("Section:", section);
        console.log("Policy Content:", policyContent);

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };

    try {
        let response;
        if (isEditMode && originalPolicyId) {
            // Update existing policy
            response = await fetch(
                `https://asa-policy-backend.onrender.com/api/policies/${encodeURIComponent(originalPolicyId)}`,
                {
                    method: "PUT",
                    headers: headers,
                    body: JSON.stringify({
                        policy_name: policyName,
                        section: section,
                        policy_content: policyContent
                    })
                }
            );
        } else {
            // Create new policy
            response = await fetch(
                "https://asa-policy-backend.onrender.com/api/policies",
                {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        policy_id: policyId,
                        policy_name: policyName,
                        section: section,
                        policy_content: policyContent,
                        status: "draft"
                    })
                }
            );
        }

        if (!response.ok) {
            // Try to get the error message from the response
            let errorMessage = isEditMode ? "Failed to update policy. Please try again." : "Failed to create policy. Please try again.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = `${isEditMode ? 'Failed to update' : 'Failed to create'} policy: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        const data = await response.json();
        console.log(isEditMode ? "Policy updated:" : "Policy created:", data.policy_name, "in section:", data.section);

        alert(isEditMode ? "Policy updated successfully" : "Policy created successfully");
        
        // Redirect back to policies page
        window.location.href = "policies.html";
    } catch (err) {
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} policy:`, err);
        alert(`Failed to ${isEditMode ? 'update' : 'create'} policy. Please try again.\n\nError: ` + err.message);
    }
    });
});