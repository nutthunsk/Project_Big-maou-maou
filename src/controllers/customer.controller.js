const { Customer, Booking, Concert } = require("../models");
const PHONE_REGEX = /^[0-9]{8,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const cleanText = (value) => String(value || "").trim();

const validatePayload = ({ fullname, email, phoneNumber }) => {
  if (!cleanText(fullname) || !cleanText(email) || !cleanText(phoneNumber)) {
    return "กรุณากรอกข้อมูลให้ครบถ้วน";
  }

  if (!EMAIL_REGEX.test(cleanText(email))) {
    return "อีเมลต้องมีรูปแบบที่ถูกต้อง (ต้องมี @)";
  }

  if (!PHONE_REGEX.test(cleanText(phoneNumber))) {
    return "เบอร์โทรต้องเป็นตัวเลข 8-15 หลัก";
  }

  return null;
};

// GET /customers
exports.index = async (_req, res) => {
  try {
    const customers = await Customer.findAll({ order: [["id", "ASC"]] });
    return res.render("customers/index", { customers });
  } catch (err) {
    console.error("Customer index error:", err);
    return res.redirect("/?error=ไม่สามารถโหลดข้อมูลลูกค้าได้");
  }
};

// GET /customers/report
exports.show = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: Booking, include: [Concert] }],
    });

    if (!customer) return res.status(404).send("Customer not found");
    return res.render("customers/show", { customer });
  } catch (err) {
    console.error("Customer show error:", err);
    return res.redirect("/customers?error=ไม่สามารถโหลดรายละเอียดลูกค้าได้");
  }
};

exports.newForm = (_req, res) => res.render("customers/create");

exports.create = async (req, res) => {
  try {
    const payload = {
      fullname: cleanText(req.body.fullname),
      email: cleanText(req.body.email),
      phoneNumber: cleanText(req.body.phoneNumber),
    };

    const error = validatePayload(payload);
    if (error)
      return res.redirect(`/customers/new?error=${encodeURIComponent(error)}`);

    await Customer.create(payload);
    return res.redirect("/customers?success=เพิ่มลูกค้าเรียบร้อย");
  } catch (err) {
    console.error("Customer create error:", err);
    return res.redirect(
      "/customers/new?error=ไม่สามารถเพิ่มลูกค้าได้ (อีเมลอาจซ้ำ)",
    );
  }
};

// POST /customers
exports.editForm = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).send("Customer not found");
    return res.render("customers/edit", { customer });
  } catch (err) {
    console.error("Customer edit form error:", err);
    return res.redirect("/customers?error=ไม่สามารถโหลดฟอร์มแก้ไขลูกค้าได้");
  }
};

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
      `/customers/${customer.id}?success=แก้ไขข้อมูลลูกค้าเรียบร้อย`,
    );
  } catch (err) {
    console.error("Customer update error:", err);
    return res.redirect(
      `/customers/${req.params.id}/edit?error=ไม่สามารถแก้ไขลูกค้าได้`,
    );
  }
};

// POST /customers/:id/delete
exports.delete = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) return res.status(404).send("Customer not found");

    await Booking.destroy({ where: { CustomerId: customer.id } });
    await customer.destroy();

    return res.redirect("/customers?success=ลบลูกค้าเรียบร้อย");
  } catch (err) {
    console.error("Customer delete error:", err);
    return res.redirect("/customers?error=ไม่สามารถลบลูกค้าได้");
  }
};
