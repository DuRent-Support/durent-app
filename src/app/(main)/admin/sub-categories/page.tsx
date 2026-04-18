import { MasterDataCrudPage } from "@/components/admin/MasterDataCrudPage";

export default function AdminSubCategoriesPage() {
  return (
    <MasterDataCrudPage
      title="Kelola Sub Categories"
      description="Tambah, edit, atau hapus sub kategori untuk klasifikasi item yang lebih detail."
      endpoint="/api/admin/sub-categories"
      entityLabel="Sub Category"
    />
  );
}
