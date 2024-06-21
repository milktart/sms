// client-side js
// run by the browser each time your view template is loaded

const g = {
  i: (x) => {
    return document.getElementById(x);
  },
  q: (x) => {
    return document.querySelector(x);
  },
  a: (x) => {
    return document.querySelectorAll(x);
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
    g.i("registerForm").addEventListener("getMessagessubmit", async (event) => {
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

    //let threadId = window.location.href.match(/messages\/(?<threadId>.+)$/i);
    //if (threadId.groups.threadId) {
    //getMessages(threadId.groups.threadId);
    //}
  }

  if (g.i("threadId") && g.i("threadId").value != "NULL") {
    getMessages(g.i("threadId").value, null);
  }
});

// Get all threads
const getThreads = async (event) => {
  const filter = event || "";
  g.i("thread-container").classList.remove("hidden");
  g.i("message-container").classList.add("hidden");
  g.i("threadId").value = "NULL"
  history.pushState({}, null, "/dashboard");

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
      //alert(JSON.stringify(data))
      const section = g.i("thread-container");
      section.innerHTML = "";

      function buildThreadBlock(thread, account) {
        const container = document.createElement("div");
        container.setAttribute("class", "thread-block");
        container.setAttribute("data-threadid", thread.threadId);
        container.setAttribute("data-thread-account", thread.profile.e164);
        container.setAttribute("data-thread-from", thread.sender);
        container.setAttribute("data-thread-recipient", thread.recipients);
        let recipients = JSON.parse(thread.recipients);

        if (recipients.indexOf(thread.sender) > -1) {
          recipients.splice(recipients.indexOf(account), 1);
        }
        container.setAttribute("data-thread-to", recipients);

        const sender = document.createElement("span");
        sender.setAttribute("class", "thread-sender");
        sender.textContent = thread.profile.e164;
        container.appendChild(sender);

        const recipient = document.createElement("span");
        recipient.setAttribute("class", "thread-recipient");
        recipient.textContent = recipients;
        container.appendChild(recipient);

        const timestamp = document.createElement("span");
        timestamp.setAttribute("class", "thread-timestamp");
        timestamp.textContent = formatDateTime(thread.createdAt, "thread");
        container.appendChild(timestamp);

        const content = document.createElement("span");
        content.setAttribute("class", "thread-preview");
        content.textContent = thread.content;
        container.appendChild(content);

        section.appendChild(container);
      }

      let numbers = localStorage.getItem("all-accounts").split(",");

      data.forEach((thread) => {
        let recipients = JSON.parse(thread.recipients);

        recipients.forEach((recipient) => {
          if (numbers.includes(recipient)) {
            buildThreadBlock(thread, recipient);
          }
        });
      });

      const threadList = g.a(".thread-block");
      for (let i = 0; i < threadList.length; i++) {
        threadList[i].addEventListener("click", async (event) => {
          getMessages(
            threadList[i].getAttribute("data-threadid"),
            threadList[i]
          );
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

const sendSMS = async (event) => {
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
  })
    .then((response) => response.json())
    .then((data) => {})
    .catch((error) => {
      alert("Error fetching data:", error);
    });

  getMessages(g.i("smsThreadId").value, g.i("smsThread").value);
};

// Get all messages in a thread
const getMessages = async (threadId, thread) => {
  history.pushState({}, null, "/messages/" + threadId);
  const metadata = await buildMetadata(threadId);
  console.log(metadata)

  const section = g.i("message-container");
  section.innerHTML = "";

  const response = await fetch("/messages/" + threadId, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      g.i("thread-container").classList.add("hidden");
      g.i("message-container").classList.remove("hidden");

      const header = document.createElement("section");
      header.setAttribute("class", "message-header");
      header.setAttribute("data-messageid", threadId);
      header.innerHTML = `<a href="#" onclick="getThreads();"><span class="material-symbols-rounded">arrow_back_ios</span></a><span class="message-header-recipients"></span>`;

      section.appendChild(header);

      data.forEach((message) => {
        const container = document.createElement("article");
        container.setAttribute("class", "message-block");
        container.setAttribute("data-messageid", message.id);
        container.setAttribute("data-message-threadid", message.threadId);
        //container.setAttribute("data-message-account", thread.getAttribute("data-thread-account"));
        container.setAttribute("data-message-from", message.sender);
        container.setAttribute("data-message-to", message.recipient);

        const sender = document.createElement("span");
        sender.setAttribute("class", "message-sender");
        sender.textContent = message.sender;
        container.appendChild(sender);

        const timestamp = document.createElement("span");
        timestamp.setAttribute("class", "message-timestamp");
        timestamp.textContent = formatDateTime(message.createdAt, "message");
        container.appendChild(timestamp);

        const content = document.createElement("span");
        content.setAttribute("class", "message-content");
        content.textContent = message.content;
        if (message.sender == thread.getAttribute("data-thread-account")) {
        content.setAttribute("class", "message-content message-sender-self");
        }

        container.appendChild(content);

        section.appendChild(container);
      });

      section.innerHTML += `
          <input type="tel" id="smsThreadId" value="${thread.getAttribute("data-threadId")}">
          <input type="tel" id="smsThread" value="${thread}">
          <input type="tel" id="smsSender" value="${thread.getAttribute("data-thread-account")}">
          <input type="tel" id="smsRecipient" value="${thread.getAttribute("data-thread-to")}">
          <input type="text" id="smsContent" required>
          <input type="button" value="Send" onclick="sendSMS();" />
      `;

    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

const buildMetadata = async (threadId) => {
  try {
    const response = await fetch("/raw/threads/" + threadId, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return await response.json();
  } catch (error) {
    console.log(error);
  }
}

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
      const dropdown = g.i("number-selector");
      const isSet = localStorage.getItem("account") || "";
      const recipients = data.numbers.map((item) => item.e164);
      localStorage.setItem("all-accounts", recipients);
      //alert(localStorage.getItem("all-accounts"));

      data.numbers.forEach((number) => {
        const option = document.createElement("option");
        option.value = number.e164;
        option.value == isSet ? option.setAttribute("selected", "true") : null;
        option.textContent = number.display;
        dropdown.appendChild(option);
      });
      filterThreads();
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

const filterThreads = async (event) => {
  getThreads(
    g.i("number-selector").options[g.i("number-selector").selectedIndex].value
  );
};

if (g.i("number-selector")) {
  g.i("number-selector").addEventListener("change", async (event) => {
    localStorage.setItem(
      "account",
      g.i("number-selector").options[g.i("number-selector").selectedIndex].value
    );
    filterThreads();
  });
}

function formatDateTime(timestamp, type) {
  const now = new Date();
  let date = new Date(timestamp);
  const calc = (now - date) / 1000;
  let formattedDate = "",
    options = "";

  if (now.toDateString() === date.toDateString()) {
    options = {
      hour: "2-digit",
      minute: "2-digit",
      hourcycle: "h23",
    };
    formattedDate = new Intl.DateTimeFormat("en-ZA", options).format(date);
  } else if (
    now.getYear() === date.getYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() - 1 === date.getDate()
  ) {
    if (type == "thread") {
      formattedDate = "Yesterday";
    }
    if (type == "message") {
      options = {
        hour: "2-digit",
        minute: "2-digit",
        hourcycle: "h23",
      };

      formattedDate =
        "Yesterday at " +
        new Intl.DateTimeFormat("en-ZA", options).format(date);
    }
  } else {
    if (type == "thread") {
      options = {
        year: "numeric",
        month: "short",
        day: "2-digit",
      };
    }
    if (type == "message") {
      options = {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourcycle: "h23",
      };
    }

    formattedDate = new Intl.DateTimeFormat("en-ZA", options).format(date);
  }
  return formattedDate;
}

// Logout
const logout = () => {
  localStorage.removeItem("token");
  window.location.replace("/");
};
//
