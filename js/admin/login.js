// Handle login form submission
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (!form) return;
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const userEmail = document.getElementById("email").value;
      const userPassword = document.getElementById("password").value;
  
      try {
        if (!window.API_BASE_URL || typeof window.API_BASE_URL !== "string") {
          throw new Error(
            "API base URL is not configured. Ensure /config.js loads before this script."
          );
        }

        const apiBaseUrl = window.API_BASE_URL.replace(/\/+$/, "");
        const response = await fetch(
          `${apiBaseUrl}/api/auth/login`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: userEmail,
                password: userPassword
            })
          }
        );  
  
        if (!response.ok) {
          throw new Error("Invalid login");
        }
  
        const data = await response.json();
  
        // Example response:
        // {
        //     "access_token": "ACCESS_TOKEN_HERE",
        //     "token_type": "bearer",
        //     "user": {
        //       "id": "ID_HERE",
        //       "email": "EMAIL_HERE (e.g. admin@example.com)",
        //       "name": "NAME_HERE (e.g. Chisom Chiobi)",
        //       "role": "ROLE_HERE (e.g. admin, policy_working_group)"
        //     }
        //   }
  
        localStorage.setItem("accessToken", data.access_token);
  
        window.location.href = "/admin/policies.html";
  
      } catch (err) {
        alert("Login failed. Check credentials.");
        console.error(err);
      }
    });
  });
  

  