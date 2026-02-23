const { Customer, Booking, Concert } = require("../models");
const PHONE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanText = (value) => String(value || "").trim();

// ตรวจสอบความถูกต้องของข้อมูลลูกค้า
const validatePayload = ({ fullname, email, phoneNumber }) => {
  if (!cleanText(fullname) || !cleanText(email) || !cleanText(phoneNumber)) {
    return "Please fill out the information completely";
  }

  if (!EMAIL_REGEX.test(cleanText(email))) {
    return "The email address must be in the correct format (it must include the @ symbol).";
  }

  if (!PHONE_REGEX.test(cleanText(phoneNumber))) {
    return "The phone number must be 8-15 digits long";
  }

  return null;
};

// GET /customers
// แสดงรายชื่อลูกค้าทั้งหมด
exports.index = async (_req, res) => {
  try {
    const customers = await Customer.findAll({ order: [["id", "ASC"]] });
    return res.render("customers/index", { customers });
  } catch (err) {
    console.error("Customer index error:", err);
    return res.redirect("/?error=Unable to load customer data");
  }
};

// GET /customers/:id
// แสดงรายละเอียดลูกค้า 1 คน พร้อมประวัติการจอง
exports.show = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: Booking, include: [Concert] }],
    });

    if (!customer) return res.status(404).send("Customer not found");
    return res.render("customers/show", { customer });
  } catch (err) {
    console.error("Customer show error:", err);
    return res.redirect("/customers?error=Unable to load customer details");
  }
};

// GET /customers/new
// เปิดฟอร์มเพิ่มลูกค้า
exports.newForm = (_req, res) => res.render("customers/create");

// POST /customers
// บันทึกข้อมูลลูกค้าใหม่
exports.create = async (req, res) => {
  try {
    // เตรียมข้อมูลจากฟอร์ม
    const payload = {
      fullname: cleanText(req.body.fullname),
      email: cleanText(req.body.email),
      phoneNumber: cleanText(req.body.phoneNumber),
    };

    const error = validatePayload(payload);
    if (error)
      return res.redirect(`/customers/new?error=${encodeURIComponent(error)}`);

    // เพิ่มข้อมูลลูกค้าในฐานข้อมูล
    await Customer.create(payload);
    return res.redirect("/customers?success=Successfully added customer");
  } catch (err) {
    console.error("Customer create error:", err);
    return res.redirect(
      "/customers/new?error=Unable to add customer (email may be a duplicate)",
    );
  }
};

// GET /customers/:id/edit
// เปิดฟอร์มแก้ไขข้อมูลลูกค้า
exports.editForm = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).send("Customer not found");
    return res.render("customers/edit", { customer });
  } catch (err) {
    console.error("Customer edit form error:", err);
    return res.redirect(
      "/customers?error=The customer edit form could not be loaded",
    );
  }
};

// POST /customers/:id
// อัปเดตข้อมูลลูกค้า
exports.update = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).send("Customer not found");

    const payload = {
      fullname: cleanText(req.body.fullname),
      email: cleanText(req.body.email),
      phoneNumber: cleanText(req.body.phoneNumber),
    };

    const error = validatePayload(payload);
    if (error) {
      return res.redirect(
        `/customers/${customer.id}/edit?error=${encodeURIComponent(error)}`,
      );
    }

    await customer.update(payload);
    return res.redirect(
      `/customers/${customer.id}?success=Customer information has been edited successfully`,
    );
  } catch (err) {
    console.error("Customer update error:", err);
    return res.redirect(
      `/customers/${req.params.id}/edit?error=Unable to edit custome`,
    );
  }
};

// POST /customers/:id/delete
// ลบลูกค้าและข้อมูลการจองที่เกี่ยวข้อง
exports.delete = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) return res.status(404).send("Customer not found");

    await Booking.destroy({ where: { CustomerId: customer.id } });
    await customer.destroy();

    return res.redirect("/customers?success=Customer successfully deleted");
  } catch (err) {
    console.error("Customer delete error:", err);
    return res.redirect("/customers?error=Unable to delete customers");
  }
};
