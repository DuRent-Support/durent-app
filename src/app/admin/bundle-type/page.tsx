import { MasterDataCrudPage } from "@/components/admin/MasterDataCrudPage";

export default function AdminBundleTypePage() {
  return (
    <MasterDataCrudPage
      title="Kelola Bundle Type"
      description="Tambah, edit, atau hapus tipe bundle untuk kebutuhan pengelompokan paket."
      endpoint="/api/admin/bundle-types"
      entityLabel="Bundle Type"
    />
  );
}
