// client-side js
// run by the browser each time your view template is loaded

const g = {
  i: x => document.getElementById(x),
  q: x => document.querySelector(x),
  a: x => document.querySelectorAll(x)
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

  if (g.i("smsButton")) {
    alert("found button !")
    g.i("smsButton").addEventListener("click", async (event) => {
      event.preventDefault();
      const sender = g.i("smsSender").value;
      const recipient = g.i("smsRecipient").value;
      const content = g.i("smsContent").value;
      
      alert(sender);
      alert(recipient)
      alert(content);

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
    getMessages(g.i("threadId").value);
  }
});

// Get all threads
const getThreads = async (event) => {
  const filter = event || "";
  g.i("threads-wrapper").classList.remove("hidden");
  g.i("messages-wrapper").classList.add("hidden");
  //g.i("threadId").value = "NULL"
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
      const section = g.i("thread-container");
      section.innerHTML = "";

      function buildThreadBlock(thread) {
        const container = document.createElement("div");
        container.setAttribute("class", "thread-block");
        container.setAttribute("data-threadid", thread.threadId);
        container.setAttribute("data-thread-account", thread.profile.e164);
        container.setAttribute("data-thread-from", thread.sender);
        container.setAttribute("data-thread-recipient", thread.recipients);
        container.setAttribute("data-thread-to", thread.recipients);

        const sender = document.createElement("span");
        sender.setAttribute("class", "thread-sender");
        sender.textContent = thread.profile.e164;
        container.appendChild(sender);

        const recipient = document.createElement("span");
        recipient.setAttribute("class", "thread-recipient");
        recipient.textContent = JSON.parse(thread.recipients);
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

      data.forEach((thread) => {
        buildThreadBlock(thread);
      });

      const threadList = g.a(".thread-block");
      for (let i = 0; i < threadList.length; i++) {
        threadList[i].addEventListener("click", async (event) => {
          g.i("messages-wrapper").innerHTML = "";
          getMessages(
            threadList[i].getAttribute("data-threadid")
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
    .then((data) => {
      let message = "";
      
      buildMessages([
        {
          "id": null,
          "threadId": g.i("smsThreadId").value,
          "sender": sender,
          "recipient": recipient,
          "createdAt": new Date(),
          "content": content,
          "profile": {
            "e164": sender
          }
        }
      ]);
      
      g.i("smsContent").value = "";
    })
    .catch((error) => {
      alert("Error fetching data:", error);
    });
};

// Get all messages in a thread
const buildMessages = async (data) => {
  const container = g.i("messages-container");

  data.forEach((msg) => {
    const message = document.createElement("article");
    message.setAttribute("class", "message-block");
    message.setAttribute("data-messageid", msg.id);
    message.setAttribute("data-message-threadid", msg.threadId);
    message.setAttribute("data-message-from", msg.sender);
    message.setAttribute("data-message-to", msg.recipient);

    const sender = document.createElement("span");
    sender.setAttribute("class", "message-sender");
    sender.textContent = msg.sender;
    message.appendChild(sender);

    const timestamp = document.createElement("span");
    timestamp.setAttribute("class", "message-timestamp");
    timestamp.textContent = formatDateTime(msg.createdAt, "message");
    message.appendChild(timestamp);

    const content = document.createElement("span");
    content.setAttribute("class", "message-content");
    content.textContent = msg.content;
    if (msg.sender == msg.profile.e164) {
      content.setAttribute("class", "message-content message-sender-self");
    }

    message.appendChild(content);
    container.appendChild(message);
  });

};

// Get all messages in a thread
const getMessages = async (threadId) => {
  history.pushState({}, null, "/messages/" + threadId);
  g.i("threadId").value = threadId;

  //const section = g.i("message-container");
  const wrapper = g.i("messages-wrapper");
  

  const response = await fetch("/messages/" + threadId, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      g.i("threads-wrapper").classList.add("hidden");
      wrapper.classList.remove("hidden");
      wrapper.innerHTML = "";
  
      const section = document.createElement("section");
      section.setAttribute("id", "message-container");
      wrapper.appendChild(section);
      
      if (g.i("message-header")) g.i("message-header").remove();
      
      const recipients = JSON.parse(data[0].recipients);
      const header = document.createElement("header");
      header.setAttribute("class", "message-header");
      header.setAttribute("id", "message-header");
      header.setAttribute("data-messageid", threadId);
      header.innerHTML = `<a href="#" onclick="getThreads();"><span class="material-symbols-rounded">arrow_back_ios</span></a><span class="message-header-recipients">${recipients}</span>`;

      wrapper.insertBefore(header, wrapper.children[0]);
      section.innerHTML = "";
      
      const container = document.createElement("section");
      container.setAttribute("class", "messages-container");
      container.setAttribute("id", "messages-container");
      section.appendChild(container);

      buildMessages(data);
    
      wrapper.innerHTML += `
        <section id="message-send-container">
          <input type="hidden" id="smsThreadId" value="${threadId}" />
          <input type="hidden" id="smsSender" value="${data[0].profile.e164}" />
          <input type="hidden" id="smsRecipient" value="${recipients}" />
          <input type="text" id="smsContent" required />
          <span onclick="sendSMS();" class="message-send-button">
            <span class="material-symbols-rounded">send</span>
          </span>
        </section>
      `;

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
      const dropdown = g.i("number-selector");
      const isSet = localStorage.getItem("account") || "";
      const recipients = data.numbers.map((item) => item.e164);
      localStorage.setItem("all-accounts", recipients);

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
