// client-side js
// run by the browser each time your view template is loaded

const g = {
  i: (id) => {
    return document.getElementById(id);
  },
  q: (s) => {
    return document.querySelector(s);
  },
  a: (s) => {
    return document.querySelectorAll(s);
  },
};

const token = localStorage.getItem("token");

$(function () {
  // Admin login
  if (g.i("loginForm")) {
    g.i("loginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const username = g.i("loginUsername").value;
      const password = g.i("loginPassword").value;

      const response = await fetch("/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        window.location.replace("/dashboard");
      } else {
        alert(data);
      }
    });
  }

  if (g.i("registerForm")) {
    // Register new user
    g.i("registerForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const username = g.i("registerUsername").value;
      const password = g.i("registerPassword").value;

      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.text();
    });
  }

  if (g.i("sendSmsForm")) {
    g.i("sendSmsForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const sender = g.i("smsSender").value;
      const recipient = g.i("smsRecipient").value;
      const content = g.i("smsContent").value;

      const response = await fetch("/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sender, recipient, content }),
      });

      const data = await response.json();
    });
  }

  if (g.i("thread-container")) {
    getThreads();
  }
});

function populateDropdown(data) {
  const dropdown = g.i("number-selector");
  //alert(data.numbers);

  data.forEach((number) => {
    const option = document.createElement("option");
    option.value = number.e164;
    option.textContent = number.display;
    dropdown.appendChild(option);
  });
}

// Get all threads
const getThreads = async (event) => {
  //event.preventDefault();
  const filter = event || "";

  const response = await fetch("/threads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filter }),
  })
    .then((response) => response.json())
    .then((data) => {
      const section = g.i("thread-container");
      section.innerHTML = "";

      data.forEach((thread) => {
        const container = document.createElement("div");
        container.setAttribute("class", "thread-block");
        container.setAttribute("data-threadid", thread.threadId);
        container.setAttribute("data-thread-account", thread.threadId);
        container.setAttribute("data-thread-from", thread.sender);
        container.setAttribute("data-thread-to", thread.recipient);

        const sender = document.createElement("span");
        sender.setAttribute("class", "thread-sender");
        sender.textContent = thread.sender;
        container.appendChild(sender);

        const recipient = document.createElement("span");
        recipient.setAttribute("class", "thread-recipient");
        recipient.textContent = thread.recipient;
        container.appendChild(recipient);

        const timestamp = document.createElement("span");
        timestamp.setAttribute("class", "thread-timestamp");
        timestamp.textContent = thread.createdAt;
        container.appendChild(timestamp);

        const content = document.createElement("span");
        content.setAttribute("class", "thread-preview");
        content.textContent = thread.content;
        container.appendChild(content);

        section.appendChild(container);
      });
      
      const threadList = g.a(".thread-block");
      for (let i = 0; i < threadList.length; i++) {
        threadList[i].addEventListener("click", async (event) => {
          getMessages(threadList[i].getAttribute("data-threadid"));
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

// Get all threads
const getMessages = async (threadId) => {
  //event.preventDefault();
  const filter = event || "";
  const section = g.i("thread-container");
  section.innerHTML = "";

  const response = await fetch("/messages/" + threadId, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      
      data.forEach((message) => {
        const container = document.createElement("div");
        container.setAttribute("class", "thread-block");
        container.setAttribute("data-threadid", message.threadId);
        container.setAttribute("data-thread-account", message.threadId);
        container.setAttribute("data-thread-from", message.sender);
        container.setAttribute("data-thread-to", message.recipient);

        const sender = document.createElement("span");
        sender.setAttribute("class", "thread-sender");
        sender.textContent = message.content;
        container.appendChild(sender);
        

        section.appendChild(container);
      });
      

    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

// Get all phone numbers tied to application
const getNumbers = async (event) => {
  const response = await fetch("/get-nums", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      populateDropdown(data.numbers);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

if (g.i("number-selector")) {
  g.i("number-selector").addEventListener("change", async (event) => {
    getThreads(
      g.i("number-selector").options[g.i("number-selector").selectedIndex].value
    );
  });
}

// Logout
const logout = () => {
  localStorage.removeItem("token");
  window.location.replace("/");
};
