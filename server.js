const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();
const port = 3030;
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
app.use(express.json());
app.use(cors());
const puppeteer = require("puppeteer");

// ctrl + k + c

app.get("/probe", (req, res) => {
  //prueba conexion con servidor
  res.json("hello from backend");
});

let db;
try {
  db = mysql.createConnection({
    host: "localhost", //coma xq son objetos
    user: "root",
    password: "",
    database: "taxfree",
  });
  db.connect(function (err) {
    //prueba conexion con db
    if (err) {
      console.log(err);
    } else {
      console.log("conexion exitosa");
    }
  });
} catch (err) {
  console.log("problemas en conexxion");
}

class Query {
  constructor(type, selector, targets) {
    this.type = type;
    this.selector = selector;
    this.targets = targets;
  }
}

app.get("/api/productosml", async (req, res) => {
  try {
    const url =
      "https://listado.mercadolibre.com.ar/" + req.query.search;


    browser = await puppeteer.launch(); // false muestra navegador
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle0" });

    // Etapa 2:
    const elements = await page.$$(".ui-search-layout__item.shops__layout-item");//24 productos
    const productsData = await Promise.all(
      elements.slice(0, 3).map(async (element) => {//div hace referencia a cada uno de los productos
        const titleElement = await element.waitForSelector(".poly-component__title a");
        const imageElement = await element.waitForSelector(
          ".poly-card__portada img"
        );

        let priceElement;
        try {
          priceElement = await element.waitForSelector(
            '.poly-content__column:nth-child(1) > .poly-component__price .andes-money-amount.andes-money-amount--cents-superscript .andes-money-amount__fraction',
            { timeout: 15000 }
          );
        } catch(err) {
          console.log('No se encontro precio');
        }
      

        const href = await titleElement.evaluate((el) => el.href); // Obtener el href usando evaluate
        const title = await titleElement.evaluate((el) => el.innerText); // Obtener el texto del título
        let price;

        if (priceElement) {
          price = await priceElement.evaluate((el) => el.innerText); // Obtener el texto del precio
        }

        const image = await imageElement.evaluate((el) => el.src  ); // Obtener el srcset de la imagen

        return {
          href: href || null, // Si no se encuentra, devolver null
          title: title || "", // Si no se encuentra, devolver cadena vacía
          price: Number(price) || 0, // Si no se encuentra, devolver cadena vacía
          image: image || "", // Si no se encuentra, devolver cadena vacía
        };
      })
    );
    res.status(200).json(productsData);
  } catch (e) {
    console.log(e);
    res.status(500).send("Error raro");
  } finally {
    if (browser) {
      await browser.close(); // Asegurarse de cerrar el navegador
    }
  }

})

// Alt + Shift + F
app.get("/api/productos", async (req, res) => {
  let browser;

  try {
    const url =
      "https://cellshop.com/catalogsearch/result/?q=" + req.query.search;

    browser = await puppeteer.launch(); // false muestra navegador
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle0" });

    // Etapa 2:
    const elements = await page.$$("div.product-item-info");//24 productos
    const productsData = await Promise.all(
      elements.map(async (element) => {//div hace referencia a cada uno de los productos
        const titleElement = await element.waitForSelector("a.product-item-link");
        const imageElement = await element.waitForSelector(
          "img.product-image-photo"
        );
        const priceElement = await element.waitForSelector(
          'span[data-price-type="finalPrice"] > span.price'
        );
        

        const href = await titleElement.evaluate((el) => el.href); // Obtener el href usando evaluate
        const title = await titleElement.evaluate((el) => el.innerText); // Obtener el texto del título
        const price = await priceElement.evaluate((el) => el.innerText); // Obtener el texto del precio
        const image = await imageElement.evaluate((el) => el.srcset); // Obtener el srcset de la imagen

        return {
          href: href || null, // Si no se encuentra, devolver null
          title: title || "", // Si no se encuentra, devolver cadena vacía
          price: price || "", // Si no se encuentra, devolver cadena vacía
          image: image || "", // Si no se encuentra, devolver cadena vacía
        };
      })
    );


    res.status(200).json(productsData);
  } catch (e) {
    console.log(e);
    res.status(500).send("Error raro");
  } finally {
    if (browser) {
      await browser.close(); // Asegurarse de cerrar el navegador
    }
  }
});

// post es una funcion de un objeto,que recibe 2 parametros string (RUTA),callback (funcion)
// Register o register (la url no dstinge mayus de minus)
app.post("/api/register", async function (request, response) {
  const { email, password, firstname, lastname, phonenumber } = request.body;
  let rows = []; //array
  try {
    if (!email || !password || !firstname || !lastname || !phonenumber) {
      throw new Error("necesitamos datos, error");
    }
    db.query(
      "SELECT * FROM users WHERE email_address = ?;",
      [email],
      function (error, results, fields) {
        rows = results;

        if (results.length > 0) {
          return response
            .status(409)
            .send("El correo electrónico ya está registrado");
        }
      }
    );

    // let rows = results.length > 0 ? results : [];

    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const encryptedPassword = await bcrypt.hash(password, salt);

    await db.query(
      "INSERT INTO users (email_address, password, first_name, last_name, phonenumber) VALUES (?, ?, ?, ?, ?);",
      [email, encryptedPassword, firstname, lastname, phonenumber]
    );

    if (results.length > 0) {
      const token = jwt.sign(1, "cat1234");
      response.send(token);
    } else {
      return response
        .status(500)
        .send("Error al buscar el usuario después de la inserción.");
    }
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return response
        .status(409)
        .send("El correo electrónico ya está registrado");
    } else {
      return response.status(500).send("Ocurrió un error en el servidor");
    }
  }
});

app.post('/api/login', async function(req, res) {
  const { email, password } = req.body;
  console.log(email);
  let rows = [];
  try{
      if (email==undefined || password==undefined)
      throw new Error(`Faltan Datos`)
      await db.query(
        "SELECT * FROM users WHERE email_address = ?;",
        [email],
        function (error, results, fields) {
          rows = results;
  
          if (results.length>0){
            // const usuario = rows[0]; //xq el 0?y no 4
            const pawword= results[0].password;      
            let compare= bcrypt.compareSync(password,pawword);
            if(compare){
              console.log("iguales");
              const token = jwt.sign(1, "cat1234");
              res.send(token);
            } else{
              console.log("no iguales")
              res.status(404).send('Contraseña incorrecta');
            }
          }else{
            res.status(404).send('Email No encontrador');
          }
        }
      );; 
      
       



  }catch(err){
    console.log(err.message);
    res.status(500).send('Ocurrio un error');
  }
;
});









app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
