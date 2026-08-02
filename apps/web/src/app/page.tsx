import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-white">
          <div className="app-container grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
            <div>
              <StatusBadge tone="info">Theo dõi quy trình minh bạch</StatusBadge>
              <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                Xét nghiệm tại nhà, an tâm từ lúc đặt lịch đến khi nhận kết quả.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
                HomeLab giúp bạn chọn xét nghiệm, đặt lịch lấy mẫu tại nhà và
                theo dõi từng bước xử lý đơn trong một trải nghiệm rõ ràng, bảo
                mật và dễ sử dụng.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/xet-nghiem">Đặt lịch xét nghiệm</ButtonLink>
                <ButtonLink href="/tra-cuu-don-hang" variant="outline">
                  Tra cứu đơn hàng
                </ButtonLink>
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
                Thông tin được sử dụng để xử lý lịch lấy mẫu. HomeLab không
                hiển thị chứng nhận, giấy phép hoặc phạm vi phục vụ khi chưa có
                dữ liệu cấu hình thật.
              </p>
            </div>

            <div className="medical-panel p-5">
              <div className="rounded-xl bg-[var(--primary-50)] p-5">
                <p className="text-sm font-bold text-[var(--primary-900)]">
                  Quy trình lấy mẫu tại nhà
                </p>
                <div className="mt-5 grid gap-3">
                  {[
                    [
                      "01",
                      "Chọn xét nghiệm",
                      "Xem thông tin mẫu, thời gian trả kết quả và giá tham khảo.",
                    ],
                    [
                      "02",
                      "Đặt lịch",
                      "Nhập thông tin cần thiết và chọn khung giờ lấy mẫu.",
                    ],
                    [
                      "03",
                      "Lấy mẫu",
                      "Nhân viên được phân công theo khu vực và lịch hẹn.",
                    ],
                    [
                      "04",
                      "Theo dõi",
                      "Cập nhật trạng thái đơn và bệnh phẩm theo từng bước.",
                    ],
                  ].map(([step, title, description]) => (
                    <div key={step} className="rounded-xl bg-white p-4">
                      <div className="flex gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary-800)] text-xs font-bold text-white">
                          {step}
                        </span>
                        <div>
                          <h2 className="font-bold text-[var(--text-primary)]">
                            {title}
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                            {description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="app-container py-14" id="quy-trinh">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                "Minh bạch",
                "Giá cuối cùng được hệ thống xác nhận khi tạo đơn, không nhận tên hoặc giá từ frontend.",
              ],
              [
                "Bảo mật",
                "Tra cứu công khai yêu cầu mã đơn và số điện thoại, dữ liệu nhạy cảm được hạn chế hiển thị.",
              ],
              [
                "Kiểm soát bệnh phẩm",
                "Barcode và chain of custody giúp nhân viên theo dõi đường đi của mẫu trong quy trình.",
              ],
            ].map(([title, description]) => (
              <Card key={title} as="article" className="p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-white">
          <div className="app-container grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--primary-700)]">
                Câu hỏi thường gặp
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
                Thông tin rõ ràng trước khi đặt lịch
              </h2>
            </div>
            <div className="grid gap-4">
              {[
                [
                  "Tôi có thể theo dõi đơn như thế nào?",
                  "Bạn dùng mã đơn và số điện thoại đã đặt lịch để tra cứu trạng thái công khai.",
                ],
                [
                  "Giá hiển thị có phải giá cuối cùng không?",
                  "Giá trong catalog là tham khảo. Hệ thống xác nhận lại giá và phí lấy mẫu khi tạo đơn.",
                ],
                [
                  "HomeLab có lưu thông tin liên hệ ở trình duyệt không?",
                  "Giỏ chỉ lưu mã xét nghiệm. Thông tin liên hệ và địa chỉ không được lưu vào localStorage.",
                ],
              ].map(([question, answer]) => (
                <Card key={question} as="article" className="p-5">
                  <h3 className="font-bold text-[var(--text-primary)]">
                    {question}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {answer}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="app-container py-14">
          <Card className="flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                Sẵn sàng chọn xét nghiệm?
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Bắt đầu từ danh mục xét nghiệm, thêm vào giỏ và đặt lịch khi bạn
                đã sẵn sàng.
              </p>
            </div>
            <ButtonLink href="/xet-nghiem">Xem danh mục xét nghiệm</ButtonLink>
          </Card>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
