![Hexagonal Architecture Topology](../assets/hexagonal-architecture.png)
# 🏛️ Domain-Driven Design & Hexagonal Architecture Layers
تو این پوشه کدهای مربوط به تزریق تکنولوژی های بیرونی لایه ی اینفرا و لایه ی اپلیکیشن به کانتینر اصلی برنامه هستش
* 📂 **Container Directory:** [`apps/api/src/container/`](../../apps/api/src/container/)


به عنوان مثال کد زیر در فایلی که در زیر مشخص کردم رو ببینین :
userRepositoryPort: asClass(PostgresUserRepositoryAdapter).classic().singleton()
* 🔗 **On Composition Root:** [`infrastructure.module.ts`](../../apps/api/src/container/modules/infrastructure.module.ts) 


لایه ی اپلیکیشن و اینفرا کاملا مستقل از هم کار میکنند و با پورت و آداپتر به هم وصل شده اند
اگر خواستیم دیتابیس را از postgres به mongodb یا هر دیتابیس دیگری تغییر بدیم بدون این که حتی یک خط کد از لایه ی اپلیکیشن تغییر کند اعمال میشود و فقط آداپتور دیتابیس به جای  PostgresUserRepositoryAdapter به مثلا MongodbUserRepositoryAdapter
تغییر میکند
به تصویر زیر دقت کنید :
![port-adapter-application](../assets/port-adapter-application.png)
----

به تصویر زیر دقت کنید :
![Clean Architecture Layers](../assets/architecture-layers.svg)

 حالا به خط کد زیر دقت کنید :
 "boundaries/element-types": [
 "error",
 {
 default: "disallow",
 rules: [
 { from: "domain", allow: ["shared"] },
 { from: "application", allow: ["domain", "shared"] },
 { from: "infrastructure", allow: ["application", "domain", "shared"] },
 { from: "shared", allow: [] },
 { from: "app", allow: ["infrastructure", "application", "domain", "shared"] },
 ],
 },
 ]

این قوانین رو گذاشتم داخل فایل لینت :
* 🔗 **lint config:** [`eslint.config.js`](../../eslint.config.js) 
  
با این قوانین هیچ کس حق نداره خلاف وابستگی پیش بره و لینت بهش ارور میده تو محیط کدنویسی 
بطور مثال اگر از کدهای لایه ی انفرا بخوایم داخل لایه ی اپلیکیشن استفاده کنیم لینت بلافاصله ارور میده

حالا این تصویر رو ببینید از محیط پایپلاین گیتهاب اکشن :
![github-action-pipeline](../assets/github-action-pipeline.png)

حالا توی کد :
run: npm run lint --if-present
داخل فایل ورکفلوی گیتهاب :

* 🔗 **lint check on GitHub Action :** [`ci-feature.yml`](../../.github/workflows/ci-feature.yml) 
  
تو این فایل گفتیم که گیتهاب اکشن بیاد و لینت رو چک کنه و اگر وابستگی اشتباه بود سمت کدهایی که به گیتهاب فرستاده میشه 
گیت هاب اکشن فیلد میشه
حتی توی رول های ریپازیتوری هم گذاشتم که اگر فیلد بشه اجازه مرج روی برنچ های اصلی داده نشه 
تصاویر زیر رو ببینید :
![img.png](../assets/img.png)
![img_2.png](../assets/img_2.png)
![img_1.png](../assets/img_1.png)

موارد مربوط به تست ها و موارد دیگه رو هم در سرفصل مربوط به خودش توضیح دادم