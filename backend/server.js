const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const bookings = [
  {
    id: "tn-001",
    listingId: "listing-101",
    studentId: "student-01",
    ownerId: "owner-01",
    moveInDate: "2026-10-01",
    status: "APPROVED",
    notes: "Looking forward to moving in!",
    createdAt: new Date().toISOString()
  },
  {
    id: "tn-002",
    listingId: "listing-102",
    studentId: "student-02",
    ownerId: "owner-01",
    moveInDate: "2026-10-15",
    status: "PENDING",
    notes: "Is deposit refundable?",
    createdAt: new Date().toISOString()
  }
];

const messages = [
  {
    id: "msg-001",
    type: "MESSAGE",
    senderId: "student-01",
    recipientId: "owner-01",
    content: "Hi, is room 101 available?",
    isRead: true,
    createdAt: new Date().toISOString()
  }
];

app.get('/api/engagement/tenancies', (req, res) => {
  res.json(bookings);
});

app.post('/api/engagement/tenancies', (req, res) => {
  const newBooking = {
    id: `tn-${Date.now()}`,
    listingId: req.body.listingId,
    studentId: req.body.studentId || 'student-01',
    ownerId: 'owner-01',
    moveInDate: req.body.moveInDate,
    status: 'PENDING',
    notes: req.body.notes,
    createdAt: new Date().toISOString()
  };
  bookings.unshift(newBooking);
  res.status(201).json(newBooking);
});

app.get('/api/engagement/messages', (req, res) => {
  res.json(messages);
});

app.post('/api/engagement/messages', (req, res) => {
  const newMsg = {
    id: `msg-${Date.now()}`,
    type: 'MESSAGE',
    senderId: req.body.senderId || 'student-01',
    recipientId: req.body.recipientId,
    content: req.body.content,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  messages.push(newMsg);
  res.status(201).json(newMsg);
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`[Haystax Spring Boot Stub] Server running on http://localhost:${PORT}`);
});
