"use server";
import { db } from "@/app/_lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isMatch } from "date-fns";

import OpenAI from "openai";

const DUMMY_REPORT =
  "### Relatorio de Finanças Pessoais\n\n#### Despesas\n\n- Despesa 1\n- Despesa 2\n\n#### Receitas\n\n- Receita 1\n- Receita 2";

export const generateAiReport = async (month: string) => {
  if (!isMatch(month, "MM")) {
    throw new Error("Invalid month");
  }
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await (await clerkClient()).users.getUser(userId);
  const userHasPremiumPlan = user.publicMetadata.subscriptionPlan === "premium";

  if (!userHasPremiumPlan) {
    throw new Error("User has no premium plan");
  }

  if (!process.env.OPENAI_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return DUMMY_REPORT;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transactions = await db.transaction.findMany({
    where: {
      date: {
        gte: new Date(`2024-${month}-01`),
        lt: new Date(`2024-${month}-31`),
      },
    },
  });
  const content = `Gere um relatório com insights sobre as minhas finanças, com dicas e orientações de como melhorar minha vida financeira. As transações estão divididas por ponto e vírgula. A estrutura de cada uma é {DATA}-{TIPO}-{VALOR}-{CATEGORIA}. São elas:
        ${transactions
          .map(
            (transaction) =>
              `${transaction.date.toLocaleDateString("pt-BR")}-R$${transaction.amount}-${transaction.type}-${transaction.category}`,
          )
          .join(";")}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Você é um especialista em gestão e organização de finanças pessoais. Você ajuda as pessoas a organizarem melhor as suas finanças.",
      },
      {
        role: "user",
        content,
      },
    ],
  });
  return completion.choices[0].message.content;
};
